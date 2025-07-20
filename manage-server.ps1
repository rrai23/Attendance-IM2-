# PowerShell script to manage Bricks Attendance System remotely via SSH
# Usage: .\manage-server.ps1 [start|stop|status|restart|logs]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "status", "restart", "logs")]
    [string]$Action
)

# SSH connection details (modify as needed)
$SSH_USER = "s24100604"
$SSH_HOST = "bricks.dcism.org"
$SSH_PATH = "/data/users/s24100604/bricks.dcism.org"

Write-Host "🌐 Managing Bricks Attendance System on $SSH_HOST" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

switch ($Action) {
    "start" {
        Write-Host "🚀 Starting daemon on remote server..." -ForegroundColor Green
        ssh "$SSH_USER@$SSH_HOST" "cd $SSH_PATH && ./start-daemon.sh"
    }
    "stop" {
        Write-Host "🛑 Stopping daemon on remote server..." -ForegroundColor Red
        ssh "$SSH_USER@$SSH_HOST" "cd $SSH_PATH && ./stop-daemon.sh"
    }
    "status" {
        Write-Host "📊 Checking daemon status on remote server..." -ForegroundColor Yellow
        ssh "$SSH_USER@$SSH_HOST" "cd $SSH_PATH && ./check-daemon.sh"
    }
    "restart" {
        Write-Host "🔄 Restarting daemon on remote server..." -ForegroundColor Magenta
        ssh "$SSH_USER@$SSH_HOST" "cd $SSH_PATH && ./restart-daemon.sh"
    }
    "logs" {
        Write-Host "📝 Showing recent logs from remote server..." -ForegroundColor Blue
        Write-Host "Press Ctrl+C to exit log viewing" -ForegroundColor Gray
        ssh "$SSH_USER@$SSH_HOST" "cd $SSH_PATH && tail -f production.log"
    }
}

Write-Host ""
Write-Host "✅ Command completed!" -ForegroundColor Green
Write-Host "🌐 Website: https://bricks.dcism.org" -ForegroundColor Cyan
