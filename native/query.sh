#!/bin/sh
# Executes the read-only Query.cs helper; no Home setters are included.
set -eu
printf 'LUMA_QUERY_TRANSPORT_BEGIN\n'
/usr/bin/dotnet /home/owner/share/tmp/sdk_tools/LumaHomeQuery.dll
printf 'LUMA_QUERY_TRANSPORT_END\n'
