# Despliegue de AXESSIA por SSH

Guía operativa. No contiene claves privadas, contraseñas ni valores de `.env`.

## Datos

- Usuario: `axessia`
- Host: `axessia.cl`
- Puerto SSH: `2200`
- Aplicación: `/home/axessia/axessia`
- Entorno Node: `/home/axessia/nodevenv/axessia/22/bin/activate`
- Clave pública en cPanel: `axessia_ssh`
- Clave privada local: `C:\Users\Alfredo\.ssh\axessia_cpanel_ed25519`

La clave privada nunca debe subirse a Git ni compartirse. Si cambia la cuenta de ChatGPT/Codex, basta conservar la clave en el computador y repetir el procedimiento.

## Probar SSH desde PowerShell

```powershell
$Key = "$env:USERPROFILE\.ssh\axessia_cpanel_ed25519"
$KnownHosts = "$env:TEMP\axessia_cp008_known_hosts"
ssh.exe -p 2200 -i $Key -o BatchMode=yes -o UserKnownHostsFile=$KnownHosts -o StrictHostKeyChecking=yes axessia@axessia.cl "cd /home/axessia/axessia && node --version && pwd"
```

Si aparece `Permission denied (publickey)`, autorizar en cPanel la clave pública asociada a `axessia_ssh`.

## Preparar y revisar la versión

```powershell
git status --short --branch
git log -1 --oneline
npm run lint
npm run build
git diff --stat
```

No incluir `.env*`, claves, tokens, `node_modules`, `.next`, `storage`, `tmp`, uploads ni documentos de clientes.

## Desplegar con archivo tar

Este método copia únicamente archivos versionados y conserva `.env`, uploads y almacenamiento existente en el servidor.

```powershell
$Commit = (git rev-parse HEAD).Trim()
git archive --format=tar --output="axessia-$Commit.tar" $Commit
scp.exe -P 2200 -i $Key -o UserKnownHostsFile=$KnownHosts "axessia-$Commit.tar" axessia@axessia.cl:/home/axessia/tmp/
```

En SSH, detener la aplicación desde Setup Node.js App si el hosting está cerca del límite de procesos y ejecutar:

```bash
set -e
cd /home/axessia/axessia
tar -xf /home/axessia/tmp/axessia-COMMIT.tar
source /home/axessia/nodevenv/axessia/22/bin/activate
npm ci --include=dev --no-audit --no-fund
./node_modules/.bin/prisma generate
NEXT_TELEMETRY_DISABLED=1 npm run build
mkdir -p tmp
touch tmp/restart.txt
```

Reemplazar `COMMIT` por el hash real. No usar `git reset --hard`, `npm audit fix --force` ni migraciones destructivas.

## Verificar

1. Confirmar en Setup Node.js App que la aplicación esté iniciada.
2. Revisar que `.next/BUILD_ID` tenga la hora del nuevo build.
3. Ejecutar `curl.exe -I https://axessia.cl/` y `curl.exe -sS https://axessia.cl/api/db/test`.
4. Probar hero, login, solicitudes y carga de documentos.
5. No modificar correos, documentos, uploads ni datos de clientes durante las pruebas.

`.cpanel.yml` puede automatizar tareas cuando el hook del repositorio funciona; si no actualiza la aplicación, usar este método tar.
