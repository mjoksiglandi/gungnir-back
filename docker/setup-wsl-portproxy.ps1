$ErrorActionPreference = "Stop"

$wslIp = (wsl sh -lc "hostname -I | awk '{print \$1}'").Trim()

if (-not $wslIp) {
  throw "No se pudo obtener la IP de WSL."
}

$rules = @(
  @{ ListenPort = 5433; ConnectPort = 5433; Name = "gungnir-postgres" },
  @{ ListenPort = 6380; ConnectPort = 6380; Name = "gungnir-redis" },
  @{ ListenPort = 1884; ConnectPort = 1884; Name = "gungnir-mosquitto" }
)

Write-Host "Usando IP de WSL: $wslIp"

foreach ($rule in $rules) {
  & netsh interface portproxy delete v4tov4 listenaddress=127.0.0.1 listenport=$($rule.ListenPort) | Out-Null
  & netsh interface portproxy add v4tov4 listenaddress=127.0.0.1 listenport=$($rule.ListenPort) connectaddress=$wslIp connectport=$($rule.ConnectPort)
  Write-Host ("Proxy listo: {0} 127.0.0.1:{1} -> {2}:{3}" -f $rule.Name, $rule.ListenPort, $wslIp, $rule.ConnectPort)
}

Write-Host ""
Write-Host "Reglas activas:"
& netsh interface portproxy show v4tov4
