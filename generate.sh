#!/usr/bin/env bash
set -e
FILES=(
    "index.html"
    "posts/index.html"
)
DEFAULT_DESIGN="modern"

rm -rf out

function gen_design() {
    for file in ${FILES[@]}
    do
        echo generating ${file} for design ${1}
        mkdir -p $(dirname out/${2}/${file})
        mako-render --var "design=${1}" --template-dir "./" src/${file} --output-file out/${2}/${file}
    done
}

gen_design "90s" "90s"
gen_design "modern" "modern"

rsync -a res/ out/
find ./out -name *.html | xargs tidy -quiet -indent --tidy-mark no --drop-empty-elements no -m

mv out/${DEFAULT_DESIGN}/* out/
rmdir out/${DEFAULT_DESIGN}
