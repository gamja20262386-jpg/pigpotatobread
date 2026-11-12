"""계산·시각 도구: 금액 읽기, 조사, 배송비 공식, 거리, 영업시간."""
import pytest

from app.tools import calc, clock
from app.tools.data import assumptions, destinations, market


@pytest.mark.parametrize("text,value", [("5만원 이하", 50000), ("2만 6천원으로", 26000), ("3만5천", 35000),
                                        ("6천원", 6000), ("26,000원", 26000), ("예산 18000원", 18000)])
def test_parse_won(text, value):
    assert calc.parse_won(text)[0][0] == value


def test_josa():
    assert calc.josa("은갈치구이", "은") == "은갈치구이는"
    assert calc.josa("고등어구이", "으로") == "고등어구이로"
    assert calc.josa("모둠회", "이") == "모둠회가"
    assert calc.josa("서귀포 올레시장 근처", "은") == "서귀포 올레시장 근처는"
    assert calc.josa("동문시장", "으로") == "동문시장으로"


def test_market_fee_formula_reads_assumptions():
    f = assumptions()["market_bundle_fee"]
    assert calc.market_fee(0) == 0
    assert calc.market_fee(1) == f["base"]
    assert calc.market_fee(2) == f["base"] + f["per_extra_stall"]
    for n in range(1, 12):
        assert calc.market_fee(n) == min(f["max"], f["base"] + f["per_extra_stall"] * (n - 1))
    assert calc.market_fee(50) == f["max"]


def test_haversine_hub_to_hamdeok_and_seogwipo():
    hub = market()["hub"]
    assert round(calc.haversine_km(hub, destinations()["hamdeok"]), 1) == 13.7
    assert calc.haversine_km(hub, destinations()["seogwipo"]) > assumptions()["delivery_radius_km"]


def test_clock_demo_time_and_hours():
    store = {"open": "10:00", "close": "21:00"}
    assert clock.is_open(store, clock.now_kst("20:30"))
    assert clock.closes_in_min(store, clock.now_kst("20:30")) == 30
    assert not clock.is_open(store, clock.now_kst("21:00"))
    assert clock.closes_in_min(store, clock.now_kst("07:00")) is None
    late = {"open": "15:00", "close": "24:00"}
    assert clock.is_open(late, clock.now_kst("23:30")) and clock.closes_in_min(late, clock.now_kst("23:30")) == 30
    with pytest.raises(ValueError):
        clock.now_kst("25:99")


def test_quote_eta_and_zone_rules():
    cat_items = [{"product_id": "p-30", "qty": 1}]
    from app.tools.data import seed_catalog
    q = calc.quote(cat_items, seed_catalog(), "hamdeok", clock.now_kst("18:00"))
    a = assumptions()
    assert q["distance_km"] == 13.7
    assert q["eta_min"] == 20 + a["hub_pack_min"] + 42          # 동문 바당횟집 prep 20 + 집하 포장 + ceil(13.7×3)
    assert q["in_zone"] and q["fees"] == {"market": 3000, "restaurants": 0, "total": 3000}
    assert any("권장 이동 시간" in w for w in q["warnings"])
    assert q["bags"] == [{"temp": "cold", "label": "냉장 보냉팩", "items": ["딱새우 1kg ×1"]}]
