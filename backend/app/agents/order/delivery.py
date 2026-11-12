"""④ 배달비·도착(delivery): 배달비와 도착 예상 시간을 계산하고 배달 범위를 확인한다(직선거리 가정, 실시간 교통 아님)."""
from __future__ import annotations

from app.agents._common import claim, ev
from app.contracts import AgentResult
from app.tools.calc import distance_km, fees, fmt, in_zone, josa, travel_min
from app.tools.data import assumptions, catalog_of, destinations, market

ID = "delivery"


def run(ctx: dict, llm=None) -> AgentResult:
    catalog = catalog_of(ctx)
    res = ctx.get("results") or {}
    bundle = (res.get("bundler") or {}).get("data") or {}
    cond = ((res.get("intake") or {}).get("data") or {}).get("conditions") or {}
    groups = bundle.get("groups") or []
    a = assumptions()
    claims = []

    dest_id = cond.get("destination_id") or ctx.get("destination_id")   # 말 이해가 고른 배송지(문장 > 앱) 우선, cart_check는 앱 값
    if dest_id and dest_id not in destinations():
        return AgentResult(agent_id=ID, ok=False, error=f"없는 배송지: {dest_id}",
                           claims=[claim(ID, "고른 배송지를 찾지 못했어요. 배송지를 다시 골라 주세요", "question", ev("input", "destination_id"))])
    if not dest_id:
        dest_id = market()["default_destination"]
        claims.append(claim(ID, f"배송지를 고르지 않아 {destinations()[dest_id]['name']} 기준으로 계산했어요", "assumption",
                            ev("dataset", "market", "기본 배송지"), ev("assumption", "default_destination", "기본 배송지(팀 가정)")))
    dest = destinations()[dest_id]

    f = fees(groups, catalog)
    stalls = sum(1 for g in groups if g["kind"] == "market")
    dist = distance_km(groups, catalog, dest)
    ready = int(bundle.get("ready_min") or 0)
    travel = travel_min(dist)
    eta = ready + travel
    zone = in_zone(dist)
    mb = a["market_bundle_fee"]
    fee_ev = ev("assumption", "market_bundle_fee", "동문시장 묶음 배송비(팀 가정)")
    if stalls:
        claims.append(claim(ID, f"시장 묶음 배송비 {fmt(f['market'])}원 = {fmt(mb['base'])}원 + {fmt(mb['per_extra_stall'])}원 × "
                                f"(시장 가게 {stalls}곳 − 1), 최대 {fmt(mb['max'])}원", "assumption", fee_ev, ev("calc", "min(max, base + per_extra_stall × (stalls − 1))")))
    if f["restaurants"]:
        claims.append(claim(ID, f"맛집 배달비 {fmt(f['restaurants'])}원(가게별 배달비 합)", "fact", ev("dataset", "stores", "가게 배달비")))
    dist_ev = ev("calc", "haversine(hub, destination)", "직선거리 기준(교통 상황 반영 안 함)")
    claims.append(claim(ID, f"{dest['name']}까지 직선거리 {dist}km", "estimate", dist_ev, ev("dataset", "market", "좌표")))
    if groups:
        claims.append(claim(ID, f"도착 예상 {eta}분 = 준비 {ready}분 + 이동 {travel}분(1km당 {a['min_per_km']}분 가정)", "estimate",
                            ev("calc", "ready_min + ceil(distance_km × min_per_km)"), ev("assumption", "min_per_km", "이동 시간(팀 가정)")))
    if not zone:
        claims.append(claim(ID, f"{josa(dest['name'], '은')} 배달 범위({a['delivery_radius_km']}km) 밖이에요. 더 가까운 배송지로 바꿔 주세요",
                            "question", dist_ev, ev("assumption", "delivery_radius_km", "배달 반경(팀 가정)")))
    return AgentResult(agent_id=ID, claims=claims,
                       data={"destination": {"id": dest["id"], "name": dest["name"]}, "fees": f, "eta_min": eta,
                             "distance_km": dist, "in_zone": zone, "ready_min": ready, "travel_min": travel})
