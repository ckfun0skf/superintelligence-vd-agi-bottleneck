#!/usr/bin/env python3
"""Bake the embedded CC-BY human-brain GLB into deterministic surface points.

The generated binary is a tightly packed little-endian Float32 XYZ array.  The
player needs only this small point cloud; it does not load the source GLB or any
remote Three.js add-ons at runtime.
"""
from __future__ import annotations

import argparse
import base64
import bisect
import json
import math
import random
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_HTML = ROOT / "sample-3d" / "brain.html"
OUTPUT = ROOT / "assets" / "models" / "v5_brain_surface_points.bin"
NORMALIZED_MAX_DIMENSION = 4.3


def mat_mul(a: list[list[float]], b: list[list[float]]) -> list[list[float]]:
    return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]


def node_matrix(node: dict) -> list[list[float]]:
    if "matrix" in node:
        values = node["matrix"]  # glTF matrices are column-major.
        return [[float(values[c * 4 + r]) for c in range(4)] for r in range(4)]
    tx, ty, tz = node.get("translation", [0, 0, 0])
    sx, sy, sz = node.get("scale", [1, 1, 1])
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    r = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]
    return [
        [r[0][0] * sx, r[0][1] * sy, r[0][2] * sz, tx],
        [r[1][0] * sx, r[1][1] * sy, r[1][2] * sz, ty],
        [r[2][0] * sx, r[2][1] * sy, r[2][2] * sz, tz],
        [0.0, 0.0, 0.0, 1.0],
    ]


def transform_point(matrix: list[list[float]], point: tuple[float, float, float]) -> tuple[float, float, float]:
    x, y, z = point
    return (
        matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z + matrix[0][3],
        matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z + matrix[1][3],
        matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z + matrix[2][3],
    )


def embedded_glb(path: Path) -> tuple[dict, bytes]:
    html = path.read_text(encoding="utf-8")
    match = re.search(r"EMBEDDED_GLB\s*=\s*'([^']+)'", html)
    if not match:
        raise ValueError(f"No embedded GLB found in {path}")
    data = base64.b64decode(match.group(1), validate=True)
    magic, version, declared_size = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or declared_size != len(data):
        raise ValueError("Embedded model is not a valid GLB 2.0 file")
    offset = 12
    document = None
    binary = None
    while offset < len(data):
        chunk_size, chunk_type = struct.unpack_from("<I4s", data, offset)
        offset += 8
        chunk = data[offset:offset + chunk_size]
        offset += chunk_size
        if chunk_type == b"JSON":
            document = json.loads(chunk.decode("utf-8").rstrip(" \x00"))
        elif chunk_type == b"BIN\x00":
            binary = chunk
    if document is None or binary is None:
        raise ValueError("GLB must contain JSON and BIN chunks")
    return document, binary


def accessor_data(document: dict, binary: bytes, accessor_index: int) -> list[tuple[float, ...]]:
    accessor = document["accessors"][accessor_index]
    view = document["bufferViews"][accessor["bufferView"]]
    component = accessor["componentType"]
    scalar_format, scalar_size = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}[component]
    arity = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[accessor["type"]]
    stride = view.get("byteStride", scalar_size * arity)
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    count = accessor["count"]
    result = []
    for i in range(count):
        offset = start + i * stride
        values = struct.unpack_from("<" + scalar_format * arity, binary, offset)
        result.append(tuple(float(v) for v in values))
    return result


def mesh_instances(document: dict):
    nodes = document["nodes"]
    scene_index = document.get("scene", 0)
    roots = document.get("scenes", [])[scene_index]["nodes"]

    def visit(node_index: int, parent: list[list[float]]):
        node = nodes[node_index]
        world = mat_mul(parent, node_matrix(node))
        if "mesh" in node:
            yield node["mesh"], world
        for child in node.get("children", []):
            yield from visit(child, world)

    identity = [[1.0 if r == c else 0.0 for c in range(4)] for r in range(4)]
    for root in roots:
        yield from visit(root, identity)


def surface_triangles(document: dict, binary: bytes):
    all_vertices: list[tuple[float, float, float]] = []
    raw_meshes = []
    for mesh_index, world in mesh_instances(document):
        mesh = document["meshes"][mesh_index]
        for primitive in mesh.get("primitives", []):
            if primitive.get("mode", 4) != 4:
                continue
            positions = accessor_data(document, binary, primitive["attributes"]["POSITION"])
            vertices = [transform_point(world, (p[0], p[1], p[2])) for p in positions]
            all_vertices.extend(vertices)
            if "indices" in primitive:
                index_values = [int(v[0]) for v in accessor_data(document, binary, primitive["indices"])]
            else:
                index_values = list(range(len(vertices)))
            raw_meshes.append((vertices, index_values))
    if not all_vertices:
        raise ValueError("No triangle mesh positions found in source GLB")

    mins = [min(p[k] for p in all_vertices) for k in range(3)]
    maxs = [max(p[k] for p in all_vertices) for k in range(3)]
    center = [(mins[k] + maxs[k]) * 0.5 for k in range(3)]
    dimension = max(maxs[k] - mins[k] for k in range(3))
    if dimension <= 0:
        raise ValueError("Source model has empty bounds")
    scale = NORMALIZED_MAX_DIMENSION / dimension

    triangles = []
    cumulative = []
    total_area = 0.0
    for vertices, indices in raw_meshes:
        for i in range(0, len(indices) - 2, 3):
            a, b, c = (vertices[indices[i + j]] for j in range(3))
            ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
            ac = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
            cross = (ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0])
            area = 0.5 * math.sqrt(sum(v * v for v in cross))
            if area <= 1e-12:
                continue
            total_area += area
            triangles.append((a, b, c))
            cumulative.append(total_area)
    if not triangles:
        raise ValueError("Source mesh contains no non-degenerate triangles")
    return triangles, cumulative, total_area, center, scale


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=4600)
    parser.add_argument("--seed", type=int, default=20261014)
    parser.add_argument("--source", type=Path, default=SOURCE_HTML)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    if args.samples <= 0:
        raise ValueError("--samples must be positive")

    document, binary = embedded_glb(args.source)
    extras = document.get("asset", {}).get("extras", {})
    triangles, cumulative, total_area, center, scale = surface_triangles(document, binary)
    rng = random.Random(args.seed)
    points = []
    for _ in range(args.samples):
        triangle_index = bisect.bisect_left(cumulative, rng.random() * total_area)
        a, b, c = triangles[min(triangle_index, len(triangles) - 1)]
        root_u = math.sqrt(rng.random())
        v = rng.random()
        weights = (1.0 - root_u, root_u * (1.0 - v), root_u * v)
        point = tuple((weights[0] * a[k] + weights[1] * b[k] + weights[2] * c[k] - center[k]) * scale for k in range(3))
        points.extend(point)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(struct.pack("<" + "f" * len(points), *points))
    print(f"Source: {extras.get('title', 'unknown')} by {extras.get('author', 'unknown')}")
    print(f"License: {extras.get('license', 'unspecified')}")
    print(f"Triangles: {len(triangles):,}; points: {args.samples:,}; seed: {args.seed}")
    print(f"Normalized max dimension: {NORMALIZED_MAX_DIMENSION:g}; output: {args.output} ({args.output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
