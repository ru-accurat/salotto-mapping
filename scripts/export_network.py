#!/usr/bin/env python3
"""
Export salotto_mapping_v0.xlsx → viz/public/network.json

Reads people, organizations, subjects, affiliations, and relationships.
Pre-computes a force-directed layout (NetworkX spring_layout) and BFS order
seeded from P004 (Emiliano Ponzi). Output is a single JSON file consumed
by the Cosmograph visualization.
"""

import json
import math
from collections import deque
from pathlib import Path

import networkx as nx
import openpyxl


ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "salotto_mapping_v0.xlsx"
OUT = ROOT / "viz" / "public" / "network.json"


def read_sheet(wb, name):
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [h for h in rows[0]]
    return [dict(zip(headers, row)) for row in rows[1:] if any(v is not None for v in row)]


def classify_person(member_status):
    if member_status in ("co_founder", "member"):
        return "member"
    if member_status == "ambient":
        return "ambient"
    return "guest"


def main():
    wb = openpyxl.load_workbook(str(XLSX), read_only=True, data_only=True)

    people = read_sheet(wb, "people")
    orgs = read_sheet(wb, "organizations")
    subjects = read_sheet(wb, "subjects")
    affiliations = read_sheet(wb, "affiliations")
    relationships = read_sheet(wb, "relationships")
    attendances = read_sheet(wb, "attendances")

    # --- Node merges: person absorbs their org ---
    MERGES = {
        "O25": "P006",   # Accurat → Gabriele Rossi
        "O62": "P003",   # YOHOHO Studio → Vittorio Perotti
        "O29": "P009",   # Nakworks → Nathalie Pozzi
    }
    MERGE_NAMES = {
        "P006": "Gabriele Rossi / Accurat",
        "P003": "Vittorio Perotti / Yohoho",
        "P009": "Nathalie Pozzi / Nakworks",
    }

    def resolve(nid):
        return MERGES.get(nid, nid)

    # --- Build nodes ---
    nodes = {}

    for p in people:
        pid = p["person_id"]
        ms = p.get("member_status", "none") or "none"
        nodes[pid] = {
            "id": pid,
            "name": MERGE_NAMES.get(pid, p["canonical_name"]),
            "class": classify_person(ms),
            "shape": "circle",
            "member_status": ms,
            "primary_role": p.get("primary_role"),
            "degree": 0,
        }

    for o in orgs:
        oid = o["org_id"]
        if oid in MERGES:
            continue
        otype = o.get("type") or ""
        is_member_class = "member-class" in otype
        nodes[oid] = {
            "id": oid,
            "name": o["name"],
            "class": "member" if is_member_class else "org",
            "shape": "hexagon",
            "org_type": otype,
            "member_status": "member" if is_member_class else None,
            "degree": 0,
        }

    # Subjects excluded from visualization — they are historical/biographical
    # figures discussed at events, not participants in the network.

    # --- Salotto hub node ---
    SALOTTO_ID = "SALOTTO"
    nodes[SALOTTO_ID] = {
        "id": SALOTTO_ID,
        "name": "Salotto Brooklyn",
        "class": "salotto",
        "shape": "hexagon",
        "member_status": "co_founder",
        "degree": 0,
    }

    # Collect people connected to Salotto: attendees + all members/co-founders
    salotto_people = {}  # pid -> weight
    for att in attendances:
        pid = resolve(att["person_id"])
        if pid in nodes:
            salotto_people[pid] = salotto_people.get(pid, 0) + 1
    for p in people:
        pid = resolve(p["person_id"])
        ms = p.get("member_status", "none") or "none"
        if ms == "co_founder":
            salotto_people[pid] = max(salotto_people.get(pid, 0), 4)
        elif ms == "member":
            salotto_people[pid] = max(salotto_people.get(pid, 0), 3)

    # --- Build edges (deduplicated, with weight = number of relationships) ---
    edge_map = {}  # (min_id, max_id) -> edge dict
    G = nx.Graph()
    G.add_nodes_from(nodes.keys())

    def add_edge(src, tgt, edge_data):
        key = (min(src, tgt), max(src, tgt))
        existing = edge_map.get(key)
        if existing is None:
            edge_data["weight"] = 1
            edge_map[key] = edge_data
        else:
            existing["weight"] += 1
            if edge_data["confidence"] > existing["confidence"]:
                existing["confidence"] = edge_data["confidence"]
                existing["type"] = edge_data["type"]
        G.add_edge(src, tgt, weight=edge_data["confidence"])
        nodes[src]["degree"] += 1
        nodes[tgt]["degree"] += 1

    for aff in affiliations:
        pid = resolve(aff["person_id"])
        oid = resolve(aff["org_id"])
        if pid == oid or pid not in nodes or oid not in nodes:
            continue
        conf = float(aff.get("confidence") or 0.6)
        add_edge(pid, oid, {
            "source": pid,
            "target": oid,
            "type": aff.get("role") or "affiliated",
            "confidence": conf,
            "kind": "affiliation",
        })

    for rel in relationships:
        pa = resolve(rel["person_a_id"])
        pb = resolve(rel["person_b_id"])
        if pa == pb or pa not in nodes or pb not in nodes:
            continue
        status = rel.get("_status", "verified")
        if status == "rejected":
            continue
        conf = float(rel.get("confidence") or 0.6)
        rtype = rel.get("type") or "unknown"
        add_edge(pa, pb, {
            "source": pa,
            "target": pb,
            "type": rtype,
            "confidence": conf,
            "status": status,
            "kind": "relationship",
        })

    # Salotto hub connections
    for pid, w in salotto_people.items():
        if pid not in nodes or pid == SALOTTO_ID:
            continue
        add_edge(SALOTTO_ID, pid, {
            "source": SALOTTO_ID,
            "target": pid,
            "type": "salotto_connection",
            "confidence": min(1.0, 0.5 + w * 0.1),
            "kind": "salotto",
        })
        # Set weight directly to reflect strength
        key = (min(SALOTTO_ID, pid), max(SALOTTO_ID, pid))
        edge_map[key]["weight"] = w

    edges = list(edge_map.values())

    max_weight = max((e["weight"] for e in edges), default=1)
    for e in edges:
        e["width"] = 0.1 + (e["weight"] / max_weight) * 0.9
        if e.get("kind") == "salotto":
            e["color"] = "#d4915a"
        else:
            e["color"] = "#4466bb"

    # Remove nodes not reachable from SALOTTO
    reachable = set()
    bfs_q = deque([SALOTTO_ID])
    reachable.add(SALOTTO_ID)
    while bfs_q:
        n = bfs_q.popleft()
        for nb in G.neighbors(n):
            if nb not in reachable:
                reachable.add(nb)
                bfs_q.append(nb)
    removed = set(nodes.keys()) - reachable
    for nid in removed:
        del nodes[nid]
        if G.has_node(nid):
            G.remove_node(nid)
    edges = [e for e in edges if e["source"] in nodes and e["target"] in nodes]

    # --- Force-directed layout ---
    # Use spring_layout with a fixed seed for reproducibility.
    # Scale to [-500, 500] range for Cosmograph viewport.
    pos = nx.spring_layout(
        G,
        k=2.5 / math.sqrt(max(len(nodes), 1)),
        iterations=800,
        seed=42,
    )

    for nid, (x, y) in pos.items():
        nodes[nid]["x"] = round(x * 1800, 2)
        nodes[nid]["y"] = round(y * 1800, 2)

    # Nodes not in the graph component get a default position
    for nid in nodes:
        if "x" not in nodes[nid]:
            nodes[nid]["x"] = 0.0
            nodes[nid]["y"] = 0.0

    # Add sequential index for Cosmograph's pointIndexBy requirement
    node_list = list(nodes.values())
    id_to_index = {}
    for i, node in enumerate(node_list):
        node["_index"] = i
        id_to_index[node["id"]] = i

    # Add source/target indices to edges
    for edge in edges:
        edge["sourceIndex"] = id_to_index.get(edge["source"], -1)
        edge["targetIndex"] = id_to_index.get(edge["target"], -1)

    # --- BFS order from P004 (Emiliano Ponzi) ---
    seed = "P004"
    bfs_order = []
    visited = set()
    queue = deque([seed])
    visited.add(seed)
    while queue:
        node = queue.popleft()
        bfs_order.append(node)
        for neighbor in sorted(G.neighbors(node)):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    # Add any remaining nodes not reachable from P004
    for nid in nodes:
        if nid not in visited:
            bfs_order.append(nid)

    # --- Output ---
    output = {
        "nodes": list(nodes.values()),
        "edges": edges,
        "bfs_order": bfs_order,
        "seed": seed,
        "stats": {
            "people": sum(1 for n in nodes.values() if n["shape"] == "circle" and n["class"] != "subject"),
            "organizations": sum(1 for n in nodes.values() if n["class"] == "org"),
            "subjects": sum(1 for n in nodes.values() if n["class"] == "subject"),
            "affiliations": sum(1 for e in edges if e["kind"] == "affiliation"),
            "relationships": sum(1 for e in edges if e["kind"] == "relationship"),
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Wrote {OUT}")
    print(f"  {output['stats']}")
    print(f"  Total nodes: {len(output['nodes'])}")
    print(f"  Total edges: {len(output['edges'])}")
    print(f"  BFS order length: {len(bfs_order)}")
    print(f"  BFS seed: {seed} ({nodes[seed]['name']})")


if __name__ == "__main__":
    main()
