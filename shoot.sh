#!/bin/zsh
# usage: ./shoot.sh name  -> downsizes shots/name.png to shots/name_s.png (1600w)
sips -Z 1600 "shots/$1.png" --out "shots/$1_s.png" >/dev/null && echo "shots/$1_s.png"
