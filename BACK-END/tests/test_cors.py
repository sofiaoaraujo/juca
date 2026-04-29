def test_cors_nao_libera_wildcard(client):
    resp = client.options(
        "/",
        headers={
            "Origin": "https://atacante.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Origem não autorizada não deve receber Access-Control-Allow-Origin
    assert resp.headers.get("access-control-allow-origin") != "*"
    assert resp.headers.get("access-control-allow-origin") != "https://atacante.com"

def test_health_check(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "online"
