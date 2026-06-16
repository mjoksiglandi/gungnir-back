set -e
. /home/gormm/.nvm/nvm.sh
nvm use 22 >/dev/null
cd /mnt/c/Users/juan.cornejo/Documents/gugnir\ back
npm run start > .wsl-live.log 2>&1