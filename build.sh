#!/bin/bash
DIR=$( cd $(dirname $0) ; pwd)
cd "$DIR"

rm -fv Kukkuniiaat-InDesign.ccx
rm -rfv build_tmp
mkdir -pv build_tmp
cp -av *.* icons build_tmp
pushd build_tmp

# Switch from debug to release
perl -pe 'if (/class="debug"/) { $_ = ""; } s/<!-- //g; s/ -->//g;' -i index.html

rm -fv *.sh *.ccx
zip -9r ../Kukkuniiaat-InDesign.ccx *
popd
rm -rfv build_tmp
