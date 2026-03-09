Set-Location 'C:\Users\fulle\Repos\DrupalPOC'
ddev exec "cd /var/www/html/src/angular && ./node_modules/.bin/ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json" *>&1 | ForEach-Object { Add-Content -Path 'C:\Users\fulle\Repos\DrupalPOC\scripts\logs\angular.log' -Value $_ -Encoding UTF8 }
