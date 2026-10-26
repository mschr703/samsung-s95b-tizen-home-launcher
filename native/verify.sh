#!/bin/sh
# Control.cs verify mode only compares live values with the saved original.
set -eu
printf 'LUMA_VERIFY_BEGIN\n'
/usr/bin/dotnet /home/owner/share/tmp/sdk_tools/LumaHomeControl.dll verify /home/owner/share/tmp/sdk_tools/LumaHomeOriginal.json
printf 'LUMA_VERIFY_END\n'
