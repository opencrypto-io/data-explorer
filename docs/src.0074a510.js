// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  return newRequire;
})({"index.js":[function(require,module,exports) {

var hideEmpty = true;

function getLengthInBytes(str) {
  var b = str.match(/[^\x00-\xff]/g);
  return str.length + (!b ? 0 : b.length);
}

function processItem(i) {
  i._size = getLengthInBytes(JSON.stringify(i));
  i._progress = Math.random();
  i._logo = null;
  var asset0 = i.assets[0];
  if (asset0.images && asset0.images.logo_square) {
    i._logo = asset0.images.logo_square.data;
  }
  return i;
}

function getType(type) {
  var fn = null;
  switch (type) {
    case 'string':
      fn = OCString;
      break;
    case 'array':
      fn = OCArray;
      break;
    case 'number':
      fn = OCNumber;
      break;
    case 'boolean':
      fn = OCBoolean;
      break;
    case 'object':
      fn = OCObject;
      break;
  }
  return fn;
}

function zeroValue() {
  return m('span.grey', '(no value)');
}

function OCBoolean(schema, val) {
  return val === true ? 'Yes' : val === false ? 'No' : zeroValue();
}

function OCString(schema, val) {
  if (!val) {
    return zeroValue();
  }
  if (schema.media && schema.media.binaryEncoding == 'base64') {
    return m('div', [m('img', { src: 'data:image/svg+xml;base64,' + val, style: 'max-height: 100px;' })]);
  }
  if (schema.format === 'url') {
    return m('a', { href: val, target: '_blank' }, val);
  }
  return val;
}

function OCNumber(schema, val) {
  return val || zeroValue();
}

function OCArray(schema, val) {
  if (!val || val.length === 0) {
    return zeroValue();
  }
  var fn = getType(schema.items.type);
  return val.map(function (i) {
    return fn ? fn(schema.items, i) : null;
  });
}

function OCObject(schema, values) {
  if (schema.patternProperties) {
    if (values) {
      schema.properties = [];
      Object.keys(values).forEach(function (k) {
        schema.properties[k] = { type: 'string' };
      });
    } else {
      return zeroValue();
    }
  }
  if (!schema.properties) {
    return m('div', 'bad object');
  }
  return m('table.table', m('tbody', Object.keys(schema.properties).map(function (p) {
    if (hideEmpty && !values[p]) {
      return null;
    }
    var pdata = schema.properties[p];
    var fn = getType(pdata.type);
    return m('tr', [m('th', pdata.title || p), m('td', fn ? fn(pdata, values ? values[p] : null) : 'unknown type: ' + pdata.type)]);
  })));
}

function githubLink(id) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'blob';

  return 'https://github.com/opencrypto-io/data/' + type + '/master/db/projects/' + id + '/project.yaml';
}

var Layout = {
  view: function view(vnode) {
    return m('div', { 'style': 'padding-bottom: 5em;' }, [m('nav#navbar.navbar', [m('.container', [m('.navbar-brand', [m('a.navbar-item', { href: 'https://data.opencrypto.io/' }, [m('#logo'), m('#logo-text', [m('span.thin', 'Open'), 'Crypto', m('span.green', 'Data')])])]), m('.navbar-menu', [m('.navbar-start', [m('a.navbar-item', { href: 'https://data.opencrypto.io' }, 'Homepage'), m('a.navbar-item.current', { href: 'https://explorer.opencrypto.io' }, 'Explorer'), m('a.navbar-item', { href: 'https://schema.opencrypto.io' }, 'Schema')]), m('.navbar-end', [m('a.navbar-item', { href: '#' }, 'How to contribute?'), m('a.navbar-item', { href: '#' }, 'FAQ')])])])]), m('.container', [m('#page', vnode.children)])]);
  }
};

var originalData = null;
var data = null;
var sortBy = 'name';
var sortReverse = false;

var ProjectList = {
  oninit: function oninit() {
    ocd.query('projects').then(function (res) {
      data = res.map(function (i) {
        return processItem(i);
      });
      originalData = _.clone(data);
      m.redraw();
    });
  },
  view: function view() {
    if (data === null) {
      return m('div', { style: 'padding: 2em;' }, 'Loading ..');
    }

    function runSort() {
      data = _.sortBy(data, sortBy);
      if (sortReverse) {
        data = data.reverse();
      }
    }
    function updateSort(value) {
      if (sortBy != value) {
        sortBy = value;
      } else {
        sortReverse = !sortReverse;
      }
      runSort();
    }

    function searchList(value) {
      data = _.clone(originalData);
      if (!value) {
        return null;
      }
      data = data.filter(function (p) {
        return Boolean(p.name.match(new RegExp(value, 'gmi')));
      });
    }

    runSort();

    return m('div', [m('.navbar.transparent.listNavBar', [m('.navbar-menu', [m('.navbar-start', [m('.navbar-item', [m('h2.title.is-4', 'Projects (' + originalData.length + ')')]), m('.navbar-item', [m('input.searchInput', { placeholder: 'Search projects ..', oninput: m.withAttr('value', searchList) })])])])]), m('#projectList', [m('table.table', [m('thead', [m('tr', [m('th', ''), m('th', m('a', { onclick: m.withAttr('value', updateSort), value: 'name' }, 'Name')), m('th', 'Project tags'), m('th', m('a', { onclick: m.withAttr('value', updateSort), value: '_progress' }, 'Completeness')), m('th', m('a', { onclick: m.withAttr('value', updateSort), value: '_size' }, 'Data size')), m('th', 'GitHub'), m('th', 'Link to Explorer')])]), m('tbody', function () {
      return data.map(function (i) {
        return m('tr', { key: i.id }, [m('td.data-logo', m('div', [i._logo ? m('img', { src: 'data:image/svg+xml;base64,' + i._logo }) : ''])), m('td', m('a.projectTitle', { href: '/project/' + i.id, oncreate: m.route.link }, i.name)), m('td', i.tags ? i.tags.join(', ') : ''), m('td', m('div', [m('progress.progress.is-primary.is-small', { value: i._progress, max: 1 }, i._progress + '%')])), m('td', (i._size / 1000).toFixed(2) + ' KB'), m('td', [m('a', { href: githubLink(i.id) }, 'Source'), ', ', m('a', { href: githubLink(i.id, 'edit') }, 'Edit')]), m('td', m('a', { href: '/project/' + i.id, oncreate: m.route.link }, 'View →'))]);
      });
    }())])])]);
  }
};

var dataItem = null;
var projectSchema = null;
var dataView = 'explorer';

var Project = {
  oninit: function oninit(vnode) {
    ocd.get('project', vnode.attrs.id).then(function (res) {
      dataItem = res;
      m.redraw();
    });
    if (!projectSchema) {
      m.request('https://schema.opencrypto.io/build/deref/project.json').then(function (res) {
        projectSchema = res;
        m.redraw();
      });
    }
  },
  view: function view(vnode) {
    if (!dataItem) {
      return m('div', { style: 'padding: 2em;' }, 'Loading ..');
    }
    var p = processItem(dataItem);

    function switchSource(type) {
      console.log(type);
      dataView = type;
    }

    return m('div', [m('h2.title.is-4', [m('a', { href: '/', oncreate: m.route.link }, 'Projects'), ' / ', m('span', p.name)]), m('#itemDetail', [m('.navbar.transparent', [m('.navbar-menu', [m('.navbar-start', [p._logo ? m('.navbar-item', m('.itemLogo', m('img', { src: 'data:image/svg+xml;base64,' + p._logo }))) : '', m('.navbar-item', m('h3.title.is-4', p.name))]), m('.navbar-end', [m('a.navbar-item', { href: githubLink(p.id, 'edit') }, [m('i.fab.fa-github', { style: 'font-size: 1.3em; padding-right: 0.3em;' }), 'Edit on GitHub']), m('.navbar-item', [m('.buttons.has-addons', [m('span.button', { class: dataView === 'explorer' ? 'is-success is-selected' : '', onclick: m.withAttr('value', switchSource), value: 'explorer' }, 'Explorer'), m('span.button', { class: dataView === 'source' ? 'is-success is-selected' : '', onclick: m.withAttr('value', switchSource), value: 'source' }, 'Source')])])])])]), function () {
      if (dataView === 'source') {
        var src = JSON.stringify(p, null, 2);
        return m('#itemSource', [m('pre', m.trust(hljs.highlight('json', src).value))]);
      }
      if (projectSchema === null) {
        return m('div', { style: 'padding: 2em;' }, 'Loading ..');
      }
      return m('#dataTable', OCObject(projectSchema, p));
    }()])]);
  }
};

var root = document.getElementById('data-explorer');
m.route(root, '/', {
  '/': { render: function render() {
      return m(Layout, m(ProjectList));
    } },
  '/project/:id': { render: function render(vnode) {
      return m(Layout, m(Project, vnode.attrs));
    } }
});
},{}],"../node_modules/parcel/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';

var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };

  module.bundle.hotData = null;
}

module.bundle.Module = Module;

var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = '' || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + '64128' + '/');
  ws.onmessage = function (event) {
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      console.clear();

      data.assets.forEach(function (asset) {
        hmrApply(global.parcelRequire, asset);
      });

      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          hmrAccept(global.parcelRequire, asset.id);
        }
      });
    }

    if (data.type === 'reload') {
      ws.close();
      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');

      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);

      removeErrorOverlay();

      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // html encode message and stack trace
  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;

  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';

  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];
      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAccept(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAccept(bundle.parent, id);
  }

  var cached = bundle.cache[id];
  bundle.hotData = {};
  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);

  cached = bundle.cache[id];
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAccept(global.parcelRequire, id);
  });
}
},{}]},{},["../node_modules/parcel/src/builtins/hmr-runtime.js","index.js"], null)
//# sourceMappingURL=/src.0074a510.map