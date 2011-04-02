#!/usr/bin/zsh

setopt extended_glob

function remove() {
    echo "<$1>"
    if [ -e $1 ]; then
        rm -f $1
    fi
}

if ! [ -e chrome ]; then
    mkdir chrome
fi

## ================================ ##

# create jar file
remove chrome/clipple.jar
zip -r -0 chrome/clipple.jar \
    content/*.{js,xul}~(*~|.svn/*) \
    locale/**/*.*~(*~|.svn/*) \
    skin/**/*.*~(*~|*.svg|.svn/*)

# create xpi file
remove clipple.xpi
zip -r -9 clipple.xpi \
    chrome/clipple.jar \
    defaults/**/*.*~(*~|.svn/*) \
    install.rdf \
    share/*.js~(*~|.svn/*) \
    components/*.js~*~
cp chrome.manifest.pack /tmp/chrome.manifest
zip -j -9 clipple.xpi /tmp/chrome.manifest
