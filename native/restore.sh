#!/bin/sh
set -eu
printf 'LUMA_RESTORE_BEGIN\n'
/usr/bin/dotnet /home/owner/share/tmp/sdk_tools/LumaHomeControl.dll restore /home/owner/share/tmp/sdk_tools/LumaHomeOriginal.json
printf 'LUMA_RESTORE_END\n'
