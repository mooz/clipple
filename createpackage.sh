#!/usr/bin/zsh

setopt extended_glob

## ================================ ##

# create jar file
rm -f chrome/clipple.jar
jar cvf0 chrome/clipple.jar \
    content/*.{js,xul}~(*~|.svn/*) \
    locale/**/*.*~(*~|.svn/*) \
    skin/**/*.*~(*~|*.svg|.svn/*)

# create xpi file
rm -f clipple.xpi
zip -r -9 clipple.xpi \
    chrome/clipple.jar \
    defaults/**/*.*~(*~|.svn/*) \
    install.rdf \
    share/*.js~(*~|.svn/*) \
    components/*.js~*~
cp chrome.manifest.pack /tmp/chrome.manifest
zip -j -9 clipple.xpi /tmp/chrome.manifest

## ================================ ##

# copy hash for creating update info
HASH=`shasum -a 1 clipple.xpi | sed s'/[ ].*$//'`
echo sha1:$HASH | xsel -ib
mv update.rdf update.rdf.bak
sed -e "s/em:updateHash=\".*\"/em:updateHash=\"sha1:$HASH\"/" update.rdf.bak > update.rdf
