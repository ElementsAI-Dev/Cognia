const BRIDGE_SOURCE = `
function installDesignerRuntimeBridge() {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.__designerRuntimeBridgeInstalled) {
    return;
  }

  window.__designerRuntimeBridgeInstalled = true;

  var nodeCounter = 0;
  var hoverId = null;
  var dragOverElement = null;
  var observer = null;
  var rafId = null;

  function postMessageToParent(payload) {
    try {
      window.parent.postMessage(payload, '*');
    } catch (_error) {
      // Ignore cross-window postMessage failures.
    }
  }

  function shouldTrackElement(element) {
    var tagName = element.tagName;
    return !(
      tagName === 'SCRIPT' ||
      tagName === 'STYLE' ||
      tagName === 'META' ||
      tagName === 'LINK' ||
      tagName === 'HEAD'
    );
  }

  function assignElementIds() {
    nodeCounter = 0;
    var nodes = document.body ? document.body.querySelectorAll('*') : [];
    for (var i = 0; i < nodes.length; i += 1) {
      var element = nodes[i];
      if (!shouldTrackElement(element)) {
        continue;
      }
      element.setAttribute('data-element-id', 'el-' + nodeCounter);
      nodeCounter += 1;
    }
  }

  function scheduleAssignElementIds() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(function () {
      assignElementIds();
      rafId = null;
    });
  }

  function getElementPayload(element) {
    if (!element) {
      return null;
    }
    var id = element.getAttribute('data-element-id');
    var rect = element.getBoundingClientRect();
    return {
      elementId: id,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    };
  }

  function interceptConsole() {
    var levels = ['log', 'info', 'warn', 'error'];
    for (var i = 0; i < levels.length; i += 1) {
      (function patchConsole(level) {
        var original = console[level];
        if (typeof original !== 'function') {
          return;
        }
        console[level] = function () {
          var args = Array.prototype.slice.call(arguments);
          var message = args
            .map(function (item) {
              if (item === null) return 'null';
              if (item === undefined) return 'undefined';
              if (typeof item === 'object') {
                try {
                  return JSON.stringify(item, null, 2);
                } catch (_jsonError) {
                  return String(item);
                }
              }
              return String(item);
            })
            .join(' ');

          postMessageToParent({
            type: 'preview-console',
            level: level,
            message: message,
            timestamp: Date.now(),
          });

          return original.apply(console, arguments);
        };
      })(levels[i]);
    }
  }

  function attachSelectionHandlers() {
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      var element = target.closest('[data-element-id]');
      if (!element) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      var payload = getElementPayload(element);
      postMessageToParent(
        Object.assign({
          type: 'element-select',
          tagName: element.tagName.toLowerCase(),
          className: element.className || '',
        }, payload || {})
      );
    });

    document.addEventListener('mouseover', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      var element = target.closest('[data-element-id]');
      if (!element) {
        return;
      }
      var id = element.getAttribute('data-element-id');
      if (hoverId === id) {
        return;
      }
      hoverId = id;
      var payload = getElementPayload(element);
      postMessageToParent(Object.assign({ type: 'element-hover' }, payload || {}));
    });

    document.addEventListener('mouseout', function () {
      hoverId = null;
      postMessageToParent({ type: 'element-hover', elementId: null });
    });
  }

  function attachDropHandlers() {
    document.addEventListener('dragenter', function (event) {
      event.preventDefault();
      document.body.classList.add('drag-active');
    });

    document.addEventListener('dragover', function (event) {
      event.preventDefault();
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      var element = target.closest('[data-element-id]');
      if (!element || element === dragOverElement) {
        return;
      }

      if (dragOverElement) {
        dragOverElement.classList.remove('drop-target');
      }

      dragOverElement = element;
      dragOverElement.classList.add('drop-target');

      var payload = getElementPayload(dragOverElement);
      postMessageToParent(Object.assign({ type: 'drag-over-element' }, payload || {}));
    });

    document.addEventListener('dragleave', function (event) {
      if (event.target === document.body) {
        document.body.classList.remove('drag-active');
      }

      if (dragOverElement) {
        dragOverElement.classList.remove('drop-target');
        dragOverElement = null;
      }
    });

    document.addEventListener('drop', function (event) {
      event.preventDefault();
      document.body.classList.remove('drag-active');

      var target = event.target;
      var targetElement = target instanceof Element ? target.closest('[data-element-id]') : null;

      if (dragOverElement) {
        dragOverElement.classList.remove('drop-target');
        dragOverElement = null;
      }

      var payload = event.dataTransfer ? event.dataTransfer.getData('application/json') : null;
      if (!payload) {
        return;
      }

      try {
        var parsed = JSON.parse(payload);
        if (!parsed || typeof parsed.code !== 'string') {
          return;
        }
        postMessageToParent({
          type: 'component-dropped',
          code: parsed.code,
          targetElementId: targetElement ? targetElement.getAttribute('data-element-id') : null,
          position: 'inside',
        });
      } catch (_error) {
        // Ignore invalid drag payloads.
      }
    });
  }

  function attachInboundMessageHandler() {
    window.addEventListener('message', function (event) {
      var data = event.data;
      if (!data || typeof data.type !== 'string') {
        return;
      }

      if (data.type === 'select-element' || data.type === 'highlight-element') {
        var className = data.type === 'select-element' ? 'selected' : 'highlighted';
        var resetClass = data.type === 'select-element' ? 'selected' : 'highlighted';

        var previous = document.querySelectorAll('.' + resetClass);
        for (var i = 0; i < previous.length; i += 1) {
          previous[i].classList.remove(resetClass);
        }

        if (data.elementId) {
          var next = document.querySelector('[data-element-id="' + data.elementId + '"]');
          if (next) {
            next.classList.add(className);
          }
        }
      }

      if (data.type === 'get-scroll-position') {
        postMessageToParent({
          type: 'scroll-position',
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        });
      }

      if (data.type === 'restore-scroll-position') {
        window.scrollTo(data.scrollX || 0, data.scrollY || 0);
      }
    });
  }

  function attachErrorHandlers() {
    window.addEventListener('error', function (event) {
      postMessageToParent({
        type: 'preview-error',
        message: event.message || 'Unknown runtime error',
        stack: event.error && event.error.stack ? event.error.stack : '',
      });
    });

    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason;
      var message = reason && reason.message ? reason.message : String(reason || 'Unknown rejection');
      postMessageToParent({
        type: 'preview-error',
        message: 'Unhandled Promise Rejection: ' + message,
        stack: reason && reason.stack ? reason.stack : '',
      });
    });
  }

  interceptConsole();
  assignElementIds();
  attachSelectionHandlers();
  attachDropHandlers();
  attachInboundMessageHandler();
  attachErrorHandlers();

  observer = new MutationObserver(function () {
    scheduleAssignElementIds();
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', function () {
      assignElementIds();
      postMessageToParent({ type: 'preview-ready' });
    });
  } else {
    postMessageToParent({ type: 'preview-ready' });
  }
}
`;

export function createDesignerBridgeModuleSource(): string {
  return `${BRIDGE_SOURCE}\n\nexport { installDesignerRuntimeBridge };\n`;
}

export function createInlineDesignerBridgeScript(): string {
  return `(function () {\n${BRIDGE_SOURCE}\ninstallDesignerRuntimeBridge();\n})();`;
}
