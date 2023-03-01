import json, os, shutil, re
from datetime import datetime

# python3 -m pip install python-frontmatter
import frontmatter

sitetree = {}

site_root = '.'
index_name = 'index'
content_root = '{}/-/content'.format(site_root)
sitetree_file_path = '{}/-/meta/sitetree.json'.format(site_root)
template_path = '{}/-/template'.format(site_root)
base_href = './'

filepath_template_map = {}
filepath_meta_map = {}

for root, dirs, files in os.walk(content_root):
	current_dir = root.replace(content_root, '')
	current_scope = sitetree
	for d in current_dir.split('/'):
		if d and d not in current_scope:
			current_scope[d] = {}
		if d:
			current_scope = current_scope[d]
	for d in dirs:
		if d:
			if not current_dir:
				sitetree[d] = {}
			else:
				current_scope[d] = {}
	for f in files:
		filepath = '{}/{}'.format(root, f)
		with open(filepath, 'r') as file:
			metadata, content = frontmatter.parse(file.read())
		metadata['path'] = filepath.replace(content_root, '').strip('/').replace('.md', '')
		metadata['canonicalPath'] = metadata['path']
		if metadata.get('template'):
			filepath_template_map[metadata['path']] = metadata['template']
			filepath_meta_map[metadata['path']] = metadata
		if metadata['path'].endswith('/{}'.format(index_name)):
			metadata['canonicalPath'] = metadata['path']
			metadata['path'] = metadata['path'].replace('/{}'.format(index_name), '')
			metadata['href'] = '{}/'.format(metadata['path'])
		elif metadata['path'] == index_name:
			metadata['canonicalPath'] = metadata['path']
			metadata['path'] = ''
		metadata['path'] = metadata['path'].strip('/')
		if not current_dir:
			sitetree[f.replace('.md', '')] = metadata
			base_href = './'
		else:
			current_scope[f.replace('.md', '')] = metadata


with open(sitetree_file_path, 'w') as sitetreefile:
	json.dump(sitetree, sitetreefile, sort_keys=True, indent=4)

print('Sitetree done! View at {}'.format(sitetree_file_path))

for path, template in filepath_template_map.items():
	dirpath = '/'.join(path.split('/')[:-1])
	if dirpath:
		os.makedirs('{}/{}'.format(site_root, dirpath), exist_ok=True)
		base_href = ''.join(['../' for a in dirpath.strip('/').split('/')])
	else:
		base_href = './'
	source_file = '{}/{}.html'.format(template_path, template)
	target_file = '{}/{}.html'.format(site_root, path)
	with open(source_file, 'r') as sf:
		source_code = sf.read()
		source_code = re.sub('<base\s+href="./">', '<base href="{}">'.format(base_href), source_code, 1)
		with open(target_file, 'w') as tf:
			tf.write(source_code)
print('Templating done!')

with open('-/palette.json') as env_file:
	environment = json.load(env_file)

sitemap_defaults = environment.get('sitemapDefaults', {})

sitemap_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'''

for path, meta in filepath_meta_map.items():
	slash_index = '/{}'.format(index_name)
	map_root = environment.get('sitemapRoot', environment.get('siteURL', ''))
	loc = '{}/{}'.format(map_root, path.replace(slash_index, '/') if path.endswith(slash_index) else path)
	if path == index_name:
		loc =  '{}/'.format(map_root)
	sitemap_xml = sitemap_xml + '''	
	<url>
		<loc>{loc}</loc>
		<lastmod>{lastmod}</lastmod>
		<changefreq>{changefreq}</changefreq>
		<priority>{priority}</priority>
	</url>'''.format(loc=loc, lastmod=meta.get('lastmod', datetime.today().strftime('%Y-%m-%d')), 
			changefreq=meta.get('changefreq', sitemap_defaults.get('changefreq', 'yearly')), 
			priority=meta.get('priority', sitemap_defaults.get('priority', 0.5)) 
		)

sitemap_xml = sitemap_xml + '''
</urlset>
'''
with open('sitemap.xml', 'w') as sitemap_file:
	sitemap_file.write(sitemap_xml)

print('sitemap.xml done!')

with open('robots.txt', 'w') as robots_file:
	robots_file.write('''User-agent: *
Allow: /

Sitemap: {}/sitemap.xml
'''.format(map_root))

print('robots.txt done!')
