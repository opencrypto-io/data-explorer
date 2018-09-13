
var hideEmpty = true
var webIds = null
var metadata = null
var currentPath = null
var projectSchema = null
var state = {
  expanded: []
}
var branches = [
  { id: 'master', url: 'https://data.opencrypto.io/data.json' },
]
var localBranch = null
if (window.location.hostname === 'localhost') {
  branches.push({ id: 'local', url: '/data/dist/data.json', local: true })
}
var currentBranch = branches[1] || branches[0]

const models = {
  project: {
    id: 'project',
    title: 'Project',
    plural: 'Projects',
    collection: 'projects',
    root: null,
    path: 'projects',
    pathx: [ 'project' ],
    schemapath: null
  },
  ledger: {
    id: 'ledger',
    title: 'Ledger',
    plural: 'Ledgers',
    collection: 'ledgers',
    root: 'project',
    path: 'projects[].ledgers[]',
    pathx: [ 'project', 'ledger' ],
    schemapath: 'properties.ledgers.items'
  },
  network: {
    id: 'network',
    title: 'Network',
    plural: 'Networks',
    collection: 'networks',
    root: 'asset',
    path: 'projects[].ledgers[].networks[]',
    pathx: [ 'project', 'ledger', 'network' ],
    schemapath: 'properties.ledgers.items.properties.networks.items'
  },
  asset: {
    id: 'asset',
    title: 'Asset',
    plural: 'Assets',
    collection: 'assets',
    root: 'project',
    path: 'projects[].assets[]',
    pathx: [ 'project', 'asset' ],
    schemapath: 'properties.assets.items'
  },
  client: {
    id: 'client',
    title: 'Client',
    plural: 'Clients',
    collection: 'clients',
    root: 'project',
    path: 'projects[].clients[]',
    pathx: [ 'project', 'client' ],
    schemapath: 'properties.clients.items'
  },
  exchange: {
    id: 'exchange',
    title: 'Exchange',
    plural: 'Exchanges',
    collection: 'exchanges',
    root: 'project',
    path: 'projects[].exchanges[]',
    pathx: [ 'project', 'exchange' ],
    schemapath: 'properties.exchanges.items'
  }
}

const wcol = 'opencrypto-weight'
const wcolif = 'opencrypto-weight-if'
const wcolmin = 'opencrypto-weight-min'

// load basic OCD
changeBranch(currentBranch.id)

function loadOCD(opts = {}) {
  console.log('Loading data pack from: %s', opts.url)
  return new ocd.Client({ dataUrl: opts.url })
}

function getCounts(i, root = 'project') {
  let types = []
  const submods = _.findKey(models, { root })
  switch (root) {
    case 'project':
      types = [
        { id: 'ledgers', ico: 'database' },
        { id: 'assets', ico: 'dollar-sign' },
        { id: 'exchanges', ico: 'exchange-alt' },
        { id: 'clients', ico: 'cog' },
      ]
      break
    case 'ledger':
      types = [
        { id: 'networks', ico: 'plug' }
      ]
  }
  let out = []
  Object.keys(types).forEach((t) => {
    const tc = types[t]
    if (i[tc.id] && i[tc.id].length > 0) {
      tc.count = i[tc.id].length
      out.push(tc)
    }
  })
  return out.map((o) => {
    return m('div', { style: 'display:inline-block; padding-right: 1em;' }, [
      m('i.fa', { class: 'fa-'+o.ico, style: 'color: grey', alt: o.id, title: o.id }),
      m('span', { style: 'padding-left: 0.5em;' }, o.count)
    ])
  })
}

function expandSubschema (val) {
  if (state.expanded.indexOf(val) !== -1) {
    state.expanded.splice(state.expanded.indexOf(val), 1)
    console.log('de-expanded: ', val, state.expanded)
  } else {
    state.expanded.push(val)
    console.log('expanded: ', val, state.expanded)
  }
}

function progressError(msgs, path, weight=1, text=undefined) {
  msgs.push({
    text,
    path: makePath(path),
    weight
  })
  return msgs
}

function checkWeightIf (schema) {
}

function calculateProgress (schema, obj, path=[], msgs=[], root=null) {
  let w = 1
  switch (schema.type) {
    case 'string':
    case 'number':
    case 'boolean':
      if (schema[wcol]) {
        if (schema[wcolif]) {
          const ret = function test(code) {
            return eval(code)
          }(schema[wcolif])
          if (!ret) {
            w = 1
            break
          }
        }
        w = (obj !== undefined && obj !== null && obj !== '') ? schema[wcol] : 0
        if (w === 0) {
          progressError(msgs, path, schema[wcol])
        }
      }
      break
    case 'array':
      if (schema[wcol] && schema.items) {
        if (((obj && obj.length == 0) || !obj) && schema[wcolmin] == 0) {
          w = 1
          break
        }
        if (schema[wcolif]) {
          const ret = function test(code) {
            return eval(code)
          }(schema[wcolif])
          if (!ret) {
            w = 1
            break
          }
        }
        if (obj) {
          let arr = obj.map((i, k) => {
            const [ prog ] = calculateProgress(schema.items, i, path.concat([k]), msgs, root)
            return prog
          })
          w = _.sum(arr) / (arr.length * schema[wcol])
        } else {
          progressError(msgs, path, schema[wcol])
          w = 0
        }
      }
      break
    case 'object':
      if (schema.properties) {
        if (schema[wcol] && schema[wcolif]) {
          const ret = function test(code) {
            return eval(code)
          }(schema[wcolif])
          if (!ret) {
            w = 1
            break
          }
        }
        let weights = {}
        let progress = {}
        Object.keys(schema.properties).forEach(p => {
          let pd = schema.properties[p]
          if (pd[wcol]) {
            weights[p] = pd[wcol]
            const [ prog ] = calculateProgress(pd, obj ? obj[p] : null, path.concat([p]), msgs, obj)
            progress[p] = prog
          }
        })
        if (Object.keys(weights).length > 0) {
          w = _.sum(Object.values(progress)) / _.sum(Object.values(weights))
        }
        if (w === 0) {
          progressError(msgs, path, schema[wcol])
        }
      }
      break
  }
  return [ w, msgs ]
}

function getLengthInBytes(str) {
  var b = str.match(/[^\x00-\xff]/g);
  return (str.length + (!b ? 0: b.length)); 
}

function githubIssueLink (path, value) {
  const title = encodeURI(`(${dataItem.id}) ${makePath(path)}`)
  const body = `Current value: \`${value}\``
  return `https://github.com/opencrypto-io/data/issues/new?labels=bug&title=${title}&body=${body}`
}

function setPath (p) {
  if (!p) {
    return null
  }
  currentPath = p
}

function makeFooter (arr, schema) {
  return makePath(arr) + ' <'+schema.type+(schema.format? ':' + schema.format : '')+'>'
}

function makePath (arr) {
  return arr.reduce((out, v) => {
    if (typeof v === 'number') {
      return out + '['+v+']'
    }
    if (typeof v === 'string' && !v.match(/^[a-zA-Z0-9_]+$/)) {
      return out + '[\''+v+'\']'
    }
    return out + '.' + v
  })
}

function unsetPath () {
  currentPath = null
}

function resolveWebId(val, type) {
  if (type.match(/^custom\//)) {
    return m('a', { href: val }, val)
  }
  const wd = webIds[type]
  if (!wd) {
    return '#'
  }
  const href = webIds[type].url.replace('@id', val)
  return m('a', { href, target: '_blank' }, val)
}

function processItem(i, type = 'project') {
  i._size = getLengthInBytes(JSON.stringify(_.pickBy(i, (value, key) => {
    return !key.match(/^_/)
  })))
  i._logo = null
  i._logo_full = null
  const [ progress, msgs ] = calculateProgress(projectSchema, i)
  i._counts = getCounts(i, type)
  i._progress = progress
  const baseCols = [ '@', 'assets', 'exchanges', 'clients', 'apps', 'blockchains' ]
  baseCols.forEach(c => {
    if (i._logo) return null
    let ic = i[c] 
    if (c === '@') {
      ic = [i]
    }
    if (ic && ic.length > 0) {
      ic.forEach(ci => {
        if (i._logo || !ci.images) return null
        if (ci.images.logo_square) {
          i._logo = ci.images.logo_square.data
        }
        if (ci.images.logo_full) {
          i._logo_full = ci.images.logo_full.data
          if (!i._logo) {
            i._logo = i._logo_full
          }
        } else if (ci.images.logo_square) {
          i._logo_full = ci.images.logo_square.data
        }
      })
    }
  })
  /*for(let n = 0; n <= 3; n++) {
    var asset0 = i.assets[n]
    if (!asset0) continue
    if (asset0.images && asset0.images.logo_square) {
      i._logo = asset0.images.logo_square.data
      i._logo_full = i._logo
    }
    if (asset0.images && asset0.images.logo_full) {
      i._logo_full = asset0.images.logo_full.data
    }
  }*/
  return i
}

function getType (type) {
  let fn = null
  switch (type) {
    case 'string':
      fn = OCString
      break
    case 'array':
      fn = OCArray
      break
    case 'number':
      fn = OCNumber
      break
    case 'boolean':
      fn = OCBoolean
      break
    case 'object':
      fn = OCObject
      break
  }
  return fn
}

function zeroValue() {
  return m('span.grey', '(no value)')
}

function OCBoolean (schema, val) {
  return val === true ? 'Yes' : (val === false ? 'No' : zeroValue())
}

function OCString (schema, val, path, root) {
  if (val === undefined || val === null) {
    return zeroValue()
  }
  let cpath = path[path.length-1]
  if (schema.media && schema.media.binaryEncoding == 'base64') {
    return m('div', [
      m('img', { src: 'data:image/svg+xml;base64,' + val, style: 'max-height: 100px;' }) 
    ])
  }
  let out = val
  if (schema.format === 'url') {
    out = m('a', { href: val, target: '_blank' }, val)
  }
  else if (schema.format === 'date') {
    out = `${val} (${moment(val).fromNow()})`
  }
  else if (schema.format == 'webid') {
    out = resolveWebId(val, path.slice(-1)[0])
  }
  if (cpath === 'contract_address') {
    if (root.blockchain === 'ethereum') {
      out = m('a', { href: `https://etherscan.io/address/${val}`, target: '_blank' }, val)
    }
  }
  else if (cpath === 'market_id') {
    let lnk = null
    switch (root.platform) {
      case 'ios':
        lnk = `http://itunes.apple.com/gb/app/${val}`
        break
      case 'android':
        lnk = `https://play.google.com/store/apps/details?id=${val}`
        break
    }
    if (lnk) {
      out = m('a', { href: lnk, target: '_blank' }, val)
    }
  }
  return m('div', [
    out,
    m('.control', m('a', { href: githubIssueLink(path, val) }, m('i.fas.fa-bug')))
  ])
}

function OCNumber (schema, val) {
  return val || zeroValue()
}

function OCArray (schema, val, path, root) {
  if (!val || val.length === 0) {
    return zeroValue()
  }
  let fn = getType(schema.items.type)
  return val.map((i, c) => {
    return fn ? fn(schema.items, i, path.concat([c]), root) : null
  })
}

function OCObject(schema, values, path, root=null) {
  let wrapper = (out) => out
  if (schema.patternProperties) {
    if (values) {
      schema.properties = []
      Object.keys(values).forEach(k => {
        schema.properties[k] = { type: 'string', format: schema['opencrypto-validation'] }
      })
    } else {
      return zeroValue()
    }
  }
  if (!schema.properties) {
    return m('div', 'bad object')
  }
  if (schema.$id && path.length > 0) {
    wrapper = (res) => {
      const match = schema.$id.match(/\/models\/([^#]+)#?$/)
      if (!match) {
        return res
      }
      const schemas = {
        ledger: projectSchema.properties.ledgers.items,
        asset: projectSchema.properties.assets.items,
        exchange: projectSchema.properties.exchanges.items,
        client: projectSchema.properties.clients.items,
        network: projectSchema.properties.ledgers.items.properties.networks.items,
        market: projectSchema.properties.exchanges.items.properties.markets.items,
      }
      const subschemaId = match[1]
      const expanded = state.expanded.indexOf(`${match[1]}:${values.id}`) !== -1
      if (!schemas[subschemaId]) {
        console.log('not exists: %s', subschemaId)
      }
      const [ progress, msgs ] = calculateProgress(schemas[subschemaId], values)

      const content = m('.box.subitem', [
        m('nav.level', [
          m('.level-left', [
            m('.level-item', m('a', { href: `/${subschemaId}/${values.pid || values.id}`, oncreate: m.route.link }, m('b', values.name))),
            m('.level-item', `[${values.id}]`),
          ]),
          m('.level-right', [
            m('.level-item', [
              getCounts(values, subschemaId),
            ]),
            m('.level-item', { style: 'color: black; width: 10em;' }, [
              m('span', { style: 'padding-right: 1em; font-size: 0.9em;' }, (progress*100).toFixed(0) + '%'),
              m('progress.progress.is-primary.is-small', { value: progress, max: 1 }, `${progress}%`) 
            ]),
            m('.level-item', m('a', { onclick: m.withAttr('value', expandSubschema), value: `${subschemaId}:${values.id}` }, expanded ? 'Collapse' : 'Expand'))
          ])
        ]),
        expanded ? m('div', res) : null
      ])
      return content
    }
  }
  return wrapper(m('table.table', m('tbody', Object.keys(schema.properties).map(p => {
    if (hideEmpty && (values[p] === undefined || values[p] === null)) {
      return null
    }
    const pdata = schema.properties[p]
    let cpath = path.concat([p])
    let fn = getType(pdata.type)
    let events = { 'data-path': makeFooter(cpath, pdata), onmouseenter: m.withAttr('data-path', setPath), onmouseleave: m.withAttr('data-path', unsetPath) }
    return m('tr', events, [
      m('th', pdata.title || p),
      m('td', fn ? fn(pdata, values ? values[p] : null, cpath, values) : 'unknown type: '+pdata.type)
    ])
  }))))
}

function githubLinkCommit(commitId) {
  return `https://github.com/opencrypto-io/data/commit/${commitId}`
}

function githubLink(id, type = 'blob') {
  return `https://github.com/opencrypto-io/data/${type}/master/db/projects/${id}/project.yaml`
}

async function changeBranch(branch) {
  console.log('Loading branch: %s', branch)
  data = null
  dataItem = null

  currentBranch = _.find(branches, { id: branch })
  ocdx = loadOCD(currentBranch)

  // update webids & metadata
  webids = await ocdx.query('webids')
  metadata = await ocdx.query('metadata')

  if (currentBranch.local) {
    localBranch = metadata.branch
  }
  // update list
  listModelAttr = null
  // update detail
  detailId = null
  m.redraw()
}

function loadLayoutData () {
  const schemaUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:1234/data/schema/build/deref/project.json'
    : 'https://schema.opencrypto.io/build/deref/project.json'
  Promise.all([
    m.request(schemaUrl),
    ocdx.query('webids'),
    ocdx.query('metadata'),
  ]).then(out => {
    projectSchema = out[0]
    webIds = out[1]
    metadata = out[2]
    m.redraw()
  })
}

const Layout = {
  oninit () {
    loadLayoutData()
  },
  view (vnode) {
    return m('div', [
      m('#toolsFooter', { style: { display: currentPath ? 'block' : 'none' }}, currentPath),
      m('div', { 'style': 'padding-bottom: 5em;' },  [
        m('nav#navbar.navbar', [
          m('.container', [
            m('.navbar-brand', [
              m('a.navbar-item', { href: 'https://data.opencrypto.io/' }, [
                m('#logo'),
                m('#logo-text', [
                  m('span.thin', 'Open'),
                  'Crypto',
                  m('span.green', 'Data'),
                ])
              ])
            ]),
            m('.navbar-menu', [
              m('.navbar-start', [
                m('a.navbar-item', { href: 'https://data.opencrypto.io' }, 'Homepage'), 
                m('a.navbar-item.current', { href: 'https://explorer.opencrypto.io' }, 'Explorer'), 
                m('a.navbar-item', { href: 'https://schema.opencrypto.io' }, 'Schema'), 
              ]),
              m('.navbar-end', [
                m('a.navbar-item', { href: '#' }, 'How to contribute?'), 
                m('a.navbar-item', { href: '#' }, 'FAQ'), 
              ])
            ])
          ])
        ]),
        m('nav#subbar.navbar', [
          m('.container', [
            m('.navbar-menu', [
              m('.navbar-start', [
                m('.navbar-item', m('label', [
                  //m('i.fas.fa-code-branch', { style: 'padding-right: 10px;' }),
                  'Branch:',
                ])),
                m('.navbar-item', [
                  m('.select.is-rounded', [
                    m('select', { onchange: m.withAttr('value', changeBranch) }, function () {
                      return branches.map((b) => m('option', {
                        selected: currentBranch.id === b.id, value: b.id 
                      }, b.local ? `[local] ${localBranch || b.id}` : b.id))
                    }())
                  ])
                ]),
                m('.navbar-item', m('label', [
                  //m('i.fas.fa-code-commit', { style: 'padding-right: 10px;' }),
                  'Commit:'
                ])),
                m('.navbar-item', [
                  m('.select.is-rounded', [
                    m('select', [
                      m('option', 'latest')
                    ])
                  ])
                ])
              ]),
              m('.navbar-end', function() {
                if (!metadata || !metadata.commit) {
                  return null
                }
                let total = null
                if (metadata.commits_count) {
                  total = m('.navbar-item', [
                    '(',
                    m('a', { href: 'https://github.com/opencrypto-io/data/commits/master' }, '158 commits'),
                    ')'
                  ])
                }
                return [
                  m('.navbar-item', [
                    m('span', { style: 'padding-right: 10px;' }, 'Current commit'),
                    m('a', { href: githubLinkCommit(metadata.commit) }, m('code', metadata.commit.substring(0,7))),
                    m('span',{ style: 'padding-left: 10px;'}, '' + moment(metadata.time).fromNow())
                  ]),
                  total,
                  m('a.navbar-item', { onclick: m.withAttr('branch', changeBranch), branch: currentBranch.id }, m('i.fas.fa-sync-alt'))
                ]
              }())
            ])
          ])
        ]),
        m('.container', function() {
          if (webIds && projectSchema) {
            return m('#page', vnode.children)
          }
          return m('div', { style: 'padding: 2em;' }, 'Loading ..')
        }())
      ])
    ])
  }
}

var originalData = null
var projectData = null
var data = null
var sortBy = 'name'
var sortReverse = false
var listModel = null
var listModelAttr = null
var modelData = null
var defaultList = 'projects'

function loadListData (vnode) {
  let model = modelData = _.find(models, { collection: vnode.attrs.type || defaultList })
  if (!modelData) {
    console.error('no model: %s', model)
  }

  listModel = model
  listModelAttr = model.collection
  ocdx.query(modelData.path).then((res) => {
    data = res.map(i => processItem(i, model.id))
    originalData = _.clone(data)
    m.redraw()
  })
}

const ProjectList = {
  oninit (vnode) {
    loadListData(vnode)
    if (projectData === null) {
      ocdx.query('projects').then((pd) => {
        projectData = _.clone(pd)
        m.redraw()
      })
    }
  },
  onupdate (vnode) {
    if (listModelAttr !== (vnode.attrs.type || defaultList)) {
      loadListData(vnode)
    }
  },
  view () {
    if (data === null || projectData === null) {
      return m('div', { style: 'padding: 2em;' }, 'Loading ..')
    }

    function runSort() {
      data = _.sortBy(data, sortBy)
      if (sortReverse) {
        data = data.reverse()
      }
    }
    function updateSort(value) {
      if (sortBy != value) {
        sortBy = value
      } else {
        sortReverse = !sortReverse
      }
      runSort()
    }

    function searchList(value) {
      data = _.clone(originalData)
      if (!value) {
        return null
      }
      data = data.filter((p) => {
        return Boolean(p.name.match(new RegExp(value, 'gmi')))
      })
    }

    runSort()

    return m('div', [
      m('nav.level.pageNavBar', [
        m('.level-left', [
          m('.level-item', [
            m('h2.title.is-4', `${modelData.plural} (${originalData.length})`),
          ]),
          m('.level-item', [
            m('input.searchInput', { placeholder: `Search ${modelData.plural.toLowerCase()} ..`, oninput: m.withAttr('value', searchList) }),
          ])
        ]),
        m('.level-right', [
          m('.level-item', m('.buttons.has-addons', Object.keys(models).map((mid) => {
            const model = models[mid]
            var classAttr = null
            if (modelData.id === model.id) {
              classAttr = 'is-selected is-info'
            }
            return m('span.level-item.button', { 
              href: `/${model.collection}`,
              oncreate: m.route.link,
              class: (modelData.id === model.id) ? 'is-selected is-warning' : ''
            }, model.plural)
          })))
        ])
      ]),
      m('#projectList', [
        m('table.table', [
          m('thead', [
            m('tr', [
              modelData.id !== 'project' ? m('th', 'Project') : null,
              m('th', ''),
              m('th', m('a', { onclick: m.withAttr('value', updateSort), value: 'name' }, 'Name')),
              m('th', 'Includes'),
              m('th', m('a', { onclick: m.withAttr('value', updateSort), value: '_progress' }, 'Completeness')),
              m('th', m('a', { onclick: m.withAttr('value', updateSort), value: '_size' }, 'Data size')),
              m('th', 'GitHub'),
              m('th', 'Link to Explorer'),
            ])
          ]),
          m('tbody', function () {
            return data.map(i => {
              const detailLink = `/${modelData.id}/${i.pid || i.id}`
              return m('tr', { key: i.id }, [
                modelData.id !== 'project' ? 
                  m('td', function () {
                    if (!i.pid) {
                      return m('span', 'n/a')
                    }
                    const pi = i.pid.split(':')[0]
                    const par = _.find(projectData, { id: pi })
                    return m('a', { href: '/project/'+pi, oncreate: m.route.link }, par.name)
                  }())
                  : null,
                m('td.data-logo', m('div', [
                  i._logo ? m('img', { src: 'data:image/svg+xml;base64,' + i._logo }) : '',
                ])),
                m('td', m('a.projectTitle', { href: detailLink, oncreate: m.route.link }, i.name)),
                m('td', i._counts),
                m('td', m('div', [
                  m('progress.progress.is-primary.is-small', { value: i._progress, max: 1 }, `${i._progress}%`) 
                ])),
                m('td', (i._size/1000).toFixed(2) + ' KB'),
                m('td', [
                  m('a', { href: githubLink(i.id) }, 'Source'),
                  ', ',
                  m('a', { href: githubLink(i.id, 'edit') }, 'Edit'),
                ]),
                m('td', m('a', { href: detailLink, oncreate: m.route.link }, 'View →' )),
              ])
            })
          }())
        ])
      ])
    ])
  }
}

var dataItem = null
var dataView = 'explorer'
var dataObject = null
var detailId = null

function loadItem (vnode) {
  state.expanded = []
  const type = vnode.attrs.type
  let id = vnode.attrs.id 
  if (vnode.attrs.subid) {
    id = [ id, vnode.attrs.subid ].join(':')
  }
  ocdx.get(type, id).then(res => {
    dataItem = processItem(res, type)
    detailId = [ vnode.attrs.type, vnode.attrs.id, vnode.attrs.subid ].join('-')  
    m.redraw()
  })
}

const Project = {
  oninit (vnode) {
    loadItem(vnode)
  },
  onupdate (vnode) {
    const id = [ vnode.attrs.type, vnode.attrs.id, vnode.attrs.subid ].join('-') 
    if (detailId !== id) {
      loadItem(vnode)
    }
  },
  view (vnode) {
    if (!dataItem) {
      return m('div', { style: 'padding: 2em;' }, 'Loading ..')
    }
    function switchSource (type) {
      dataView = type
    }
    const p = dataItem
    const model = models[vnode.attrs.type]

    if (!model) {
      console.log('Model not found: %s', vnode.attrs.type)
      return null
    }
    
    if (!model.pathx) {
      model.pathx = ['project']
    }

    return m('div', [
      m('nav.level.pageNavBar', [
        m('.level-left', [
          m('.level-item', [
            m('h2.title.is-4', model.pathx.map((mid, i) => {
              const mod = models[mid]
              return [ 
                (i > 0) ? m('span', ' → ') : null,
                '[',
                m('a', { href: `/${mod.collection}`, oncreate: m.route.link }, mod.id),
                '] ',
                m('a', { href: `/${mod.id}/${(mod.pathx && p.pid) ? p.pid.split(':').slice(0,i+1).join(':') : p.id}`, oncreate: m.route.link }, (model.pathx.length > 1) ? (p.pid ? p.pid.split(':')[i] : p.id) : p.id)
              ]
            }))
          ])
        ])
      ]),
      m('#itemDetail', [
        m('.level', [
          m('.level-left', [
            p._logo_full ? m('.navbar-item', m('.itemLogo', m('img', { src: 'data:image/svg+xml;base64,' + p._logo_full }))) : '',
            m('.navbar-item', m('h3.title.is-4', p.name))
          ]),
          m('.level-right', [
            m('.level-item', p._counts),
            m('a.level-item', { href: githubLink(p.id, 'edit') }, [
              m('i.fab.fa-github', { style: 'font-size: 1.3em; padding-right: 0.3em;' }),
              'Edit on GitHub'
            ]),
            m('.level-item', [
              m('.buttons.has-addons', [
                m('span.button', { class: dataView === 'explorer' ? 'is-success is-selected' : '', onclick: m.withAttr('value', switchSource), value: 'explorer' }, 'Explorer'),
                m('span.button', { class: dataView === 'source' ? 'is-success is-selected' : '', onclick: m.withAttr('value', switchSource), value: 'source' }, 'Source'),
              ])
            ])
          ])
        ]),
        function () {
          if (dataView === 'source') {
            const src = JSON.stringify(p, null, 2)
            return m('#itemSource', [
              m('pre', m.trust(hljs.highlight('json', src).value))
            ])
          }
          if (projectSchema === null) {
            return m('div', { style: 'padding: 2em;' }, 'Loading ..')
          }
          const schema = model.schemapath ? jmespath.search(projectSchema, model.schemapath) : projectSchema
          dataObject = OCObject(schema, dataItem, [])
          return m('#dataTable', dataObject)
        }()
      ]),
    ])
  }
}

const root = document.getElementById('data-explorer')
m.route(root, '/', {
  '/': { render: () => m(Layout, m(ProjectList)) },
  '/:type': { render: (vnode) => m(Layout, m(ProjectList, vnode.attrs)) },
  '/:type/:id': { render: (vnode) => m(Layout, m(Project, vnode.attrs)) }
})
