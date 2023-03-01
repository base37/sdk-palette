window.LiveElement = window.LiveElement || {}
window.LiveElement.Palette = window.LiveElement.Palette || {}
window.LiveElement.Palette.version = '3.1.7'
window.LiveElement.Palette.processors = window.LiveElement.Palette.processors || {}
window.LiveElement.Palette.environment = window.LiveElement.Palette.environment || {}
window.LiveElement.Palette.meta = window.LiveElement.Palette.meta || {}


window.LiveElement.Palette.processors.navInner = pages =>  {
	return ({
	'@palette-nav-linkcount': Array.isArray(pages) ? pages.length : 0, 
	'#innerHTML': Array.isArray(pages) 
		? pages.map(p => p && p.name ? p : {}).map(
			p => `<a href="${ window.LiveElement.Palette.environment.singlePage ? (p.href?'#'+p.href:(p.path?'#'+p.path:'')) : (p.href || p.path || './') }" ${p.canonicalPath == window.LiveElement.Palette.environment.location.path ? 'class="active"' : ''} title="${p.title || ''}">${p.title || p.name}</a>`
		).join('') : ''
})
}
window.LiveElement.Palette.processors.getNavPages = navName => {
	return window.jsonata(`sitetree.**[$exists(nav.${navName})]^(nav.${navName})`).evaluate(window.LiveElement.Palette.meta)
}
window.LiveElement.Palette.processors.buildNav = navName => {
	return window.jsonata(`$navInner($getNavPages("${navName}"))`).evaluate(window.LiveElement.Palette.meta, window.LiveElement.Palette.processors)
}
window.LiveElement.Palette.processors.getSiblingPages = path => {
	var basePath = path.split('/').slice(0,-1).join('\\/')
	basePath = basePath ? `${basePath}\\/` : ''
	if (basePath) {
		return path ? window.jsonata(`sitetree.**[$match(path, /^${basePath}[^\\/]+$/)][]`).evaluate(window.LiveElement.Palette.meta) : []
	} else {
		return path ? window.jsonata(`sitetree.*`).evaluate(window.LiveElement.Palette.meta).map(p => p.index ? p.index : p) : []
	}
}
window.LiveElement.Palette.processors.buildSiblingPagesMenu = () => {
	var siblingPages = window.LiveElement.Palette.processors.getSiblingPages(window.LiveElement.Palette.environment.location.path)
	siblingPages.sort((a, b) => ((a.nav || {}).pagesmenu || 999999999) - ((b.nav || {}).pagesmenu || 999999999))
	return window.LiveElement.Palette.processors.navInner(siblingPages)
}
window.LiveElement.Palette.processors.getBreadcrumbPages = path => {
	var slashIndex = `/${window.LiveElement.Palette.environment.defaultPath}`
	var pathSplit = [""].concat(path.split('/').map((p, i, a) => a.slice(0, i+1).join('/'))).filter(p => !p.endsWith(slashIndex))
	return pathSplit.map(path => window.jsonata(`sitetree.**[path = "${path}"]`).evaluate(window.LiveElement.Palette.meta)).filter(p => p)
}
window.LiveElement.Palette.processors.buildBreadcrumb = () => {
	if (window.LiveElement.Palette.environment.location.path == window.LiveElement.Palette.environment.defaultPath) {
		return {'#innerHTML': ''}
	} else {
		return window.jsonata(`$navInner($getBreadcrumbPages(location.path))`).evaluate(window.LiveElement.Palette.environment, window.LiveElement.Palette.processors)
	}
}


window.LiveElement.Palette.processors.getContent = path => window.jsonata(`'-/content/' & (path ? path : location.path) & '.md'`).evaluate(window.LiveElement.Palette.environment)


window.LiveElement.Palette.canonicaliseRenderObject = function(data, contentType, content, sourceURI) {
	var output = data && typeof data == 'object' ? data : {'_content': data}
	output = {...output, ...{
		'_contentType': output['_contentType'] || contentType, 
		'_content': output['_content'] || content, 
		'_sourceURI': output['_sourceURI'] || sourceURI,
		'_environment': window.LiveElement.Palette.environment, 
		'_meta': window.LiveElement.Palette.meta
	}}
	return output
}
window.LiveElement.Palette.renderTargetElement = function(renderObject, targetElement, contentType, content, sourceURI) {
	renderObject = window.LiveElement.Palette.canonicaliseRenderObject(renderObject, contentType, content, sourceURI)
	Object.keys(renderObject).forEach(k => {
		if (k[0] == '@') {
			targetElement.setAttribute(k.slice(1), renderObject[k])
		} else if (k[0] == '#') {
			targetElement[k.slice(1)] = renderObject[k]
		}
	})
	targetElement.dispatchEvent(new window.CustomEvent('palette-render', {
		bubbles: true, 
		detail: {
			renderObject: renderObject, targetElement: targetElement, contentType: contentType, 
			content: content, sourceURI: sourceURI
		}
	}))
	return targetElement
}
window.LiveElement.Palette.renderAndResolve = function(processor, renderObject, query, targetElement, contentType, content, sourceURI, resolve) {
	var bindings = {contentType: contentType, content: content, sourceURI: sourceURI, 
		environment: window.LiveElement.Palette.environment, meta: window.LiveElement.Palette.meta, processors: window.LiveElement.Palette.processors}
	renderObject = window.LiveElement.Palette.canonicaliseRenderObject(renderObject, contentType, content, sourceURI)
	renderObject = query ? window.LiveElement.Palette.canonicaliseRenderObject(window.jsonata(query).evaluate(renderObject, bindings), contentType, content, sourceURI) : renderObject
	if (processor && typeof processor == 'function') {
		var p = processor(renderObject)
		if (p && typeof p == 'object' && typeof p.constructor == 'function' && p.constructor.name == 'Promise') {
			p.then(po => resolve(window.LiveElement.Palette.renderTargetElement(po, targetElement, contentType, content, sourceURI)))
		} else {
			resolve(window.LiveElement.Palette.renderTargetElement(p, targetElement, contentType, content, sourceURI))
		}
	} else {
		resolve(window.LiveElement.Palette.renderTargetElement(renderObject, targetElement, contentType, content, sourceURI))
	}
}

window.LiveElement.Palette.render = function(targetElement, contentType, sourceURI, content, processor=undefined, query=undefined) {
	return new window.Promise((resolve, reject) => {
		if (targetElement && typeof targetElement.setAttribute == 'function' && typeof targetElement.removeAttribute == 'function') {
			if (contentType && typeof contentType == 'string' && content && typeof content == 'string') {
				var canonicaliseRenderObject = function(data) {
					return window.LiveElement.Palette.canonicaliseRenderObject(data, contentType, content, sourceURI)
				}, renderTargetElement = function(renderObject, targetElement) {
					window.LiveElement.Palette.renderTargetElement(renderObject, targetElement, contentType, content, sourceURI)
				}, renderAndResolve = function(processor, renderObject, query, targetElement) {
					window.LiveElement.Palette.renderAndResolve(processor, renderObject, query, targetElement, contentType, content, sourceURI, resolve)
				}
				if (contentType == 'text/html' || sourceURI.endsWith('.html')) {
					var container = document.createElement('template')
					var parseMeta = function(element) {
						var meta = {}
						if (element && typeof element.querySelectorAll == 'function') {
							element.querySelectorAll('meta[name][content]').forEach(metaTag => {
								var paletteScope = metaTag.getAttribute('palette-group')
								if (paletteScope) {
									meta[paletteScope] = meta[paletteScope] || {}
									meta[paletteScope][metaTag.getAttribute('name')] = metaTag.getAttribute('content')
								} else {
									meta[metaTag.getAttribute('name')] = metaTag.getAttribute('content')
								}
								metaTag.remove()
							})
						}
						return meta
					}
					container.innerHTML = content
					var node = container.content.cloneNode(true),
					output = canonicaliseRenderObject(content)
					output['#innerHTML'] = node ? node.innerHTML : ''
					renderAndResolve(processor, output, query, targetElement)
				} else if (contentType == 'application/json' || sourceURI.endsWith('.json')) {
					output = canonicaliseRenderObject(JSON.parse(content))
					renderAndResolve(processor, output, query, targetElement)
				} else if (window.LiveElement.Palette.environment.yamlSupport 
					&& contentType.endsWith('/yaml') || contentType.endsWith('/x-yaml')  || contentType.endsWith('/vnd.yaml') || sourceURI.endsWith('.yaml')) {
					output = canonicaliseRenderObject(window.YAML.parse(content))
					renderAndResolve(processor, output, query, targetElement)
				} else if (contentType == 'text/markdown' || sourceURI.endsWith('.md')) {
					output = canonicaliseRenderObject(content)
					var openingFenceRegex = new window.RegExp('^(?<openingfence>-+)\n'), openingFenceMatch = content.match(openingFenceRegex)
					if (openingFenceMatch && openingFenceMatch.groups && openingFenceMatch.groups.openingfence) {
						var contentSplit = content.split(openingFenceMatch.groups.openingfence).filter(n => n)
						if (contentSplit.length > 1) {
							output['_frontmatter'] = contentSplit.shift().trim()
							output['_markdown'] = contentSplit.join(openingFenceMatch.groups.openingfence)
						} else {
							output['_frontmatter'] = ''
							output['_markdown'] = content
						}
					} else {
						output['_frontmatter'] = ''
						output['_markdown'] = content
					}
					if (output['_frontmatter']) {
						if (output['_frontmatter'][0] == '{' && output['_frontmatter'].slice(-1) == '}') {
							output = canonicaliseRenderObject({...window.JSON.parse(output['_frontmatter']), ...output})
						} else if (window.LiveElement.Palette.environment.yamlSupport) {
							output = canonicaliseRenderObject({...window.YAML.parse(output['_frontmatter']), ...output}) 
						}
					}
					output['#innerHTML'] = window.marked.parse(output['_markdown'], {headerIds: false})
					renderAndResolve(processor, output, query, targetElement)
				} else {
					output = canonicaliseRenderObject(content)
					output['#innerHTML'] = String(content)
					renderAndResolve(processor, output, query, targetElement)
				}
			} else {
				resolve(targetElement)
			}
		} else {
			reject('targetElement is not a valid DOM Element')
		}
	})
}

window.LiveElement.Palette.switchColorScheme = function(newColorScheme) {
    var oldColorScheme = newColorScheme == 'dark' ? 'light' : 'dark'
    document.querySelectorAll(`link[href][palette-${newColorScheme}]`).forEach(t => {
        t.setAttribute(oldColorScheme, t.getAttribute('href'))
        t.setAttribute('href', t.getAttribute(`palette-${newColorScheme}`))
    })
    document.querySelectorAll(`img[src][palette-${newColorScheme}]`).forEach(t => {
        t.setAttribute(oldColorScheme, t.getAttribute('src'))
        t.setAttribute('src', t.getAttribute(`palette-${newColorScheme}`))
    })
}


window.LiveElement.Live.processors.palette = function(input) {
	var unRenderedWithSource = Array.from(document.querySelectorAll('[palette-source]:not([palette-rendered])')), sourceMap = {}, pp = []
	var bindings = {contentType: null, content: null, sourceURI: null, 
		environment: window.LiveElement.Palette.environment, meta: window.LiveElement.Palette.meta, processors: window.LiveElement.Palette.processors}
	unRenderedWithSource.forEach(m => {
		m.setAttribute('palette-rendered', true)
		var sourceURI = window.jsonata(m.getAttribute('palette-source')).evaluate({
		}, bindings).replace('.html.md', '.md')
		sourceURI = sourceURI.replace('/.', `/${window.LiveElement.Palette.environment.defaultPath}.`)
		sourceMap[sourceURI] = sourceMap[sourceURI] || []
		sourceMap[sourceURI].push(m)
	})
	Object.keys(sourceMap).forEach(sourceURI => {
		pp.push(window.fetch(sourceURI).then(response => {
			response.text().then(content => {
				sourceMap[sourceURI].forEach(m => {
					var query = m.getAttribute('palette-query') || undefined, processorName = m.getAttribute('palette-processor') || undefined, 
						processor = processorName ? window.LiveElement.Palette.processors[processorName] : undefined
					window.LiveElement.Palette.render(m, response.headers.get('Content-type'), sourceURI, content, processor, query)
				})
			})
		}).catch(err => sourceMap[sourceURI].forEach(m => m.removeAttribute('palette-rendered'))))
	})
	var unRenderedNoSource = Array.from(document.querySelectorAll('[palette-query]:not([palette-source]):not([palette-rendered])'))
	unRenderedNoSource.forEach(m => {
		m.setAttribute('palette-rendered', true)
		var query = m.getAttribute('palette-query') || undefined, processorName = m.getAttribute('palette-processor') || undefined, 
			processor = processorName ? window.LiveElement.Palette.processors[processorName] : undefined
		pp.push(new window.Promise(resolve => {
			window.LiveElement.Palette.renderAndResolve(processor, {
				'_environment': window.LiveElement.Palette.environment, 
				'_meta': window.LiveElement.Palette.meta
			}, query, m, null, null, null, resolve)
		}))
	})
	return window.Promise.all(pp).then(() => {
		if (typeof window.LiveElement.Palette.processors[window.location.host] == 'function' && window.LiveElement.Palette.environment 
			&& window.LiveElement.Palette.environment.host && window.LiveElement.Palette.environment.host[window.location.host] 
			&& typeof window.LiveElement.Palette.environment.host[window.location.host] == 'object') {
			window.LiveElement.Palette.processors[window.location.host](window.LiveElement.Palette.environment.host[window.location.host])
		}

	})
}


window.addEventListener('hashchange', event => {
	window.LiveElement.Palette.environment.location = window.LiveElement.Palette.environment.location || {}
	window.LiveElement.Palette.environment.location.hash = window.location.hash
	if (window.LiveElement.Palette.environment.singlePage) {
		if (window.LiveElement.Palette.environment.location.hash) {
			window.LiveElement.Palette.environment.location.path = window.LiveElement.Palette.environment.location.hash.slice(1)
			document.querySelectorAll('[palette-rendered="true"]').forEach(p => p.removeAttribute('palette-rendered'))
		}
	}
})

if (window.matchMedia && typeof window.matchMedia == 'function') {
	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
	    window.LiveElement.Palette.switchColorScheme('dark')
	}        
	if (window.matchMedia('(prefers-color-scheme: dark)') && typeof window.matchMedia('(prefers-color-scheme: dark)').addEventListener == 'function') {
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
		   window.LiveElement.Palette.switchColorScheme(event.matches ? 'dark' : 'light')
		})		
	}
}

window.navigator.serviceWorker.register('worker.js')


var loadPromises = []
loadPromises.push(window.fetch('-/palette.json').then(r => r.json()).then(environment => {
	if (environment.host && environment.host[window.location.host] && typeof environment.host[window.location.host] == 'object') {
		Object.keys(environment.host[window.location.host]).forEach(k => {
			if (environment.host[window.location.host][k] == 'object' && typeof host[window.location.host][k] == 'object') {
				environment[k] = {...(environment[k] || {}), ...environment.host[window.location.host][k]}
			} else {
				environment[k] = environment.host[window.location.host][k]
			}
		})
	}
	environment.defaultPath = environment.defaultPath || 'index'
	environment.location.hash = window.location.hash
	environment.location.host = environment.location.host || window.location.host
	environment.location.hostname = environment.location.hostname || window.location.hostname
	environment.location.href = [environment.location.origin || window.location.origin, ...window.location.pathname.split('/').filter(m => m)].join('/')
	environment.location.origin = environment.location.origin || window.location.origin
	environment.location.pathname = window.location.pathname
	environment.location.port = environment.location.port || environment.location.port === '' ? environment.location.port : window.location.port
	environment.location.protocol = environment.location.protocol || window.location.protocol
	environment.location.search = window.location.search
	environment.location.base = (document.querySelector('base') || {getAttribute: () => window.location.href}).getAttribute('href')
	if (environment.defaultSuffix) {
		var replacer = `.${environment.defaultSuffix}`
		;(['href', 'pathname']).forEach(v => {
			if (environment.location[v].endsWith(replacer)) {
				environment.location[v] = environment.location[v].replace(new window.RegExp(`${replacer}$`, ''), '')
			}
		})
	}
	var url = new URL(environment.location.base, window.location.href)
	environment.location.path = window.location.href.replace(url.href, '') || environment.defaultPath
	if (environment.location.path.indexOf('?') > -1) {
		environment.location.path = environment.location.path.split('?').slice(0,-1).join('?')
		environment.location.path = environment.location.path || environment.defaultPath
	}
	if (environment.singlePage) {
		if (environment.location.hash) {
			environment.location.path = environment.location.hash.slice(1)
		}
	} else {
		if (environment.location.hash) {
			environment.location.path = environment.location.path.split('#').slice(0,-1).join('#')
		}		
	}
	if (environment.defaultSuffix) {
		var replacer = `.${environment.defaultSuffix}`
		if (environment.location.path.endsWith(replacer)) {
			environment.location.path = environment.location.path.replace(new window.RegExp(`${replacer}$`, ''), '')
		}
		if (environment.location.path.endsWith('/')) {
			environment.location.path = `${environment.location.path}${environment.defaultPath}`
		}
	}
	return environment
}).then(environment => {
	window.LiveElement.Palette.environment = environment
	var pp = []
	if (Array.isArray(window.LiveElement.Palette.environment.meta)) {
		window.LiveElement.Palette.environment.meta.forEach(m => {
			pp.push(window.fetch(`-/meta/${m}.json`).then(r => r.json()).then(metaObject => {
				window.LiveElement.Palette.meta[m] = metaObject
			}))
		})
	}
	return window.Promise.all(pp).then(() => {
		window.LiveElement.Live.listeners.palette = {period: environment.refreshPeriod || 100, processor: 'palette'}
	})
}))

document.querySelectorAll('template[palette-include]').forEach(templateElement => {
	loadPromises.push(window.fetch(`${templateElement.getAttribute('palette-include')}.html`.replace('.html.html', '.html')).then(r => r.text()).then(templateSource => {
		var template = document.createElement('template')
		template.innerHTML = templateSource
		templateElement.replaceWith(template.content.cloneNode(true))
	}))
})

window.Promise.all(loadPromises).then(() => {
	document.body.addEventListener('touchstart', event => true)
	document.querySelectorAll('script[palette-include]').forEach(scriptElement => {
		scriptElement.setAttribute('src', scriptElement.getAttribute('palette-include'))
		scriptElement.removeAttribute('palette-include')
	})
	window.dispatchEvent(new window.Event('palette-load'))
})
