#!/usr/bin/env bash
set -e
FILES=(
    "index.html"
    "socials.html"
    "posts/index.html"
)

rm -rf out

for file in ${FILES[@]}
do
    echo generating $file
    mkdir -p $(dirname out/${file})
    mako-render --template-dir "./" src/${file} --output-file out/${file}
done

rsync -a res/ out/
