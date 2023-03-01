/* global */
window.LiveElement.Element.load(null, '-/').then(() => {
    // do things with the loaded elements
})

window.LiveElement.Palette.processors['localhost:4433'] = function(hostSettings) {
    if (hostSettings.defaultSuffix && !window.LiveElement.Palette.environment.singlePage) {
        document.querySelectorAll('a[href]:not([href*="."]):not([href$="/"])').forEach(a => {
            a.setAttribute('href', `${a.getAttribute('href')}.${hostSettings.defaultSuffix}`)
        })
    }
}

