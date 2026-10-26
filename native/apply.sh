#!/bin/sh
set -eu
printf 'LUMA_APPLY_BEGIN\n'
/usr/bin/dotnet /home/owner/share/tmp/sdk_tools/LumaHomeControl.dll apply /home/owner/share/tmp/sdk_tools/LumaHomeOriginal.json
printf 'LUMA_APPLY_END\n'
