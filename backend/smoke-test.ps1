param(
    [string]$BaseUrl = 'http://127.0.0.1:5000'
)

function Write-Result {
    param(
        [string]$Name,
        [bool]$Success,
        [string]$Details
    )

    $status = if ($Success) { 'PASS' } else { 'FAIL' }

    Write-Host "[$status] $Name"

    if ($Details) {
        Write-Host "       $Details"
    }

    return $Success
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Path,
        [string]$JsonBody = $null,
        $Session = $null
    )

    $uri = "$BaseUrl$Path"

    $params = @{
        Uri             = $uri
        Method          = $Method
        Headers         = @{ 'Content-Type' = 'application/json' }
        UseBasicParsing = $true
        ErrorAction     = 'Stop'
    }

    if ($JsonBody) {
        $params.Body = $JsonBody
    }

    if ($Session) {
        $params.WebSession = $Session
    }

    try {
        return Invoke-WebRequest @params
    }
    catch {
        if ($_.Exception.Response) {
            return $_.Exception.Response
        }

        throw
    }
}

function Read-JsonLine {
    param(
        [string]$Line
    )

    try {
        return $Line | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

$results = @()

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$timestamp = Get-Date -UFormat "%s"
$username = "smoketest-$timestamp"
$password = 'Password123!'
$wrongPassword = 'wrongpass'

Write-Host "Starting smoke test against $BaseUrl"
Write-Host ""

# ============================================================
# 1. Check server reachable
# ============================================================

$reachable = $false

try {
    $check = Invoke-JsonRequest `
        -Method 'GET' `
        -Path '/api/auth/me' `
        -Session $session

    if ($check.StatusCode -in 200, 401, 403) {
        $reachable = $true

        Write-Result `
            'Server reachable' `
            $true `
            "HTTP $($check.StatusCode)"
    }
    else {
        Write-Result `
            'Server reachable' `
            $false `
            "Unexpected status $($check.StatusCode)"
    }
}
catch {
    Write-Result `
        'Server reachable' `
        $false `
        "$($_.Exception.Message)"
}

if (-not $reachable) {
    Write-Host ""
    Write-Host "Aborting smoke tests because the backend is not reachable."
    exit 1
}

# ============================================================
# 2. Register user
# ============================================================

$registerBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

$registerResp = Invoke-JsonRequest `
    -Method 'POST' `
    -Path '/api/auth/register' `
    -JsonBody $registerBody `
    -Session $session

$registerSuccess = $false

if ($registerResp.StatusCode -in 200, 201) {
    $registerSuccess = $true

    Write-Result `
        'Register user' `
        $true `
        "Created $username"
}
else {
    Write-Result `
        'Register user' `
        $false `
        "HTTP $($registerResp.StatusCode)"
}

$results += @{
    Name   = 'Register user'
    Passed = $registerSuccess
}

# ============================================================
# 3. Successful login
# ============================================================

$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

$loginResp = Invoke-JsonRequest `
    -Method 'POST' `
    -Path '/api/auth/login' `
    -JsonBody $loginBody `
    -Session $session

$loginSuccess = $false

if ($loginResp.StatusCode -eq 200) {

    $cookieHeader = $loginResp.Headers['Set-Cookie']

    $hasTokenCookie = (
        $cookieHeader -and
        $cookieHeader -match 'token=' -and
        $cookieHeader -match 'HttpOnly'
    )

    if ($hasTokenCookie) {
        $loginSuccess = $true

        Write-Result `
            'Successful login with HTTP-only cookie' `
            $true `
            'Token cookie found with HttpOnly flag'
    }
    else {
        Write-Result `
            'Successful login with HTTP-only cookie' `
            $false `
            'Token cookie missing or not HttpOnly'
    }
}
else {
    Write-Result `
        'Successful login with HTTP-only cookie' `
        $false `
        "HTTP $($loginResp.StatusCode)"
}

$results += @{
    Name   = 'Successful login'
    Passed = $loginSuccess
}

# ============================================================
# 4. Verify /me authenticated
# ============================================================

$meResp = Invoke-JsonRequest `
    -Method 'GET' `
    -Path '/api/auth/me' `
    -Session $session

$meSuccess = $false

if ($meResp.StatusCode -eq 200) {

    try {
        $body = $meResp.Content | ConvertFrom-Json

        if ($body.username -eq $username) {
            $meSuccess = $true

            Write-Result `
                '/api/auth/me returns user' `
                $true `
                'Username matched'
        }
        else {
            Write-Result `
                '/api/auth/me returns user' `
                $false `
                "Unexpected username $($body.username)"
        }
    }
    catch {
        Write-Result `
            '/api/auth/me returns user' `
            $false `
            'Failed to parse JSON'
    }
}
else {
    Write-Result `
        '/api/auth/me returns user' `
        $false `
        "HTTP $($meResp.StatusCode)"
}

$results += @{
    Name   = '/api/auth/me auth'
    Passed = $meSuccess
}

# ============================================================
# 5. Rate-limit login
# ============================================================

Write-Host ""
Write-Host "Testing login rate limit..."

$rateLimitHit = $false

for ($i = 1; $i -le 4; $i++) {

    $wrongLoginBody = @{
        username = $username
        password = $wrongPassword
    } | ConvertTo-Json

    $resp = Invoke-JsonRequest `
        -Method 'POST' `
        -Path '/api/auth/login' `
        -JsonBody $wrongLoginBody `
        -Session $session

    if ($i -lt 4) {

        if ($resp.StatusCode -eq 400) {
            Write-Host "Attempt ${i}: expected failure and got HTTP 400"
        }
        elseif ($resp.StatusCode -eq 401) {
            Write-Host "Attempt ${i}: expected failure and got HTTP 401"
        }
        else {
            Write-Host "Attempt ${i}: unexpected status HTTP $($resp.StatusCode)"
        }
    }
    else {

        if ($resp.StatusCode -eq 429) {

            $rateLimitHit = $true

            Write-Result `
                'Rate limit on login' `
                $true `
                'HTTP 429 on attempt 4'
        }
        else {

            Write-Result `
                'Rate limit on login' `
                $false `
                "HTTP $($resp.StatusCode) on attempt 4"
        }
    }
}

$results += @{
    Name   = 'Rate limit on login'
    Passed = $rateLimitHit
}

# ============================================================
# 6. Check Winston logs and request IDs
# ============================================================

$logDir = Join-Path $PSScriptRoot 'logs'

$logValidation = $false

if (-not (Test-Path $logDir)) {

    Write-Result `
        'Log verification' `
        $false `
        'Log directory not found'
}
else {

    $latestApp = Get-ChildItem `
        -Path $logDir `
        -Filter 'app-*.log' |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestApp) {

        Write-Result `
            'Log verification' `
            $false `
            'No app log found'
    }
    else {

        $lines = Get-Content $latestApp.FullName -Tail 100

        $jsonEntries = foreach ($line in $lines) {
            Read-JsonLine $line
        }

        $jsonEntries = $jsonEntries |
            Where-Object { $_ -ne $null }

        $hasRequestId = $jsonEntries |
            Where-Object { $_.requestId } |
            Select-Object -First 1

        $hasRateLimitLog = $jsonEntries |
            Where-Object {
                $_.message -eq 'Rate limit blocked'
            } |
            Select-Object -First 1

        if ($hasRequestId -and $hasRateLimitLog) {

            Write-Result `
                'Winston logs and requestId' `
                $true `
                'Found requestId and rate-limit entry'

            $logValidation = $true
        }
        else {

            $missing = @()

            if (-not $hasRequestId) {
                $missing += 'requestId'
            }

            if (-not $hasRateLimitLog) {
                $missing += 'rate-limit entry'
            }

            Write-Result `
                'Winston logs and requestId' `
                $false `
                ("Missing: {0}" -f ($missing -join ', '))
        }
    }
}

$results += @{
    Name   = 'Winston logs and requestId'
    Passed = $logValidation
}

# ============================================================
# 7. Final summary
# ============================================================

Write-Host ""
Write-Host "================================"
Write-Host "       SMOKE TEST SUMMARY"
Write-Host "================================"
Write-Host ""

$passedCount = 0
$failedCount = 0

foreach ($r in $results) {

    if ($r.Passed) {
        $status = 'PASS'
        $passedCount++
    }
    else {
        $status = 'FAIL'
        $failedCount++
    }

    Write-Host "[$status] $($r.Name)"
}

Write-Host ""
Write-Host "Passed: $passedCount"
Write-Host "Failed: $failedCount"
Write-Host ""

if ($failedCount -eq 0) {

    Write-Host "ALL TESTS PASSED"
    exit 0
}
else {

    Write-Host "$failedCount TEST(S) FAILED"
    exit 1
}