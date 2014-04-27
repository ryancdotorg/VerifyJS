/** @define {boolean} */
var WITH_CSS = true;

/** @define {boolean} */
var WITH_DEBUG = true;

VerifyJS = (function() {
  var __VerifyJS = {};

  /* BEGIN SHA256 STUFF */
  // Eratosthenes seive to find primes up to 311 for magic constants. This is why SHA256 is better than SHA1
  var i=1,
      j,
      K=[],
      H=[],
      sixteen=16,
      doc = document;

  while(++i<18)
    for(j=i*i;j<312;j+=i)
      H[j]=1;

  function x(num,root){
    return(Math.pow(num,1/root)%1)*4294967296|0;
  }

  for(i=1,j=0;i<313;)
    if(!H[++i])
      H[j]=x(i,2), K[j++]=x(i,3);

  function add(x, y){ return (((x>>1)+(y>>1))<<1)+(x&1)+(y&1); }

  function S (X, n) { return ( X >>> n ) | (X << (32 - n)); }

  /**
   * sha256
   * @param {string} the string to hash
   * @param {function(string)} callback for the result
   * @return {string} the hash encoded as hex
   */
  __VerifyJS['hash'] = function(b, callback){
    var HASH = H.slice(i=0),
        s = unescape(encodeURI(b)), /* encode as utf8 */
        W = [],
        l = s.length,
        m = [],
        a, y, z;
    for(;i<l;) m[i>>2] |= (s.charCodeAt(i) & 0xff) << 8*(3 - i++%4);

    l *= 8;

    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[z=((l + 64 >> 9) << 4) + 15] = l;

    for (i=0 ; i<z; i+=sixteen ) {
      a = HASH.slice(j=0,8);

      for (; j<64;a[4] = add(a[4],y)) {
        if (j < sixteen) W[j] = m[j + i];
        else W[j] = add(
          add(S(y=W[j-2],17) ^ S(y,19) ^ (y>>>10), W[j - 7]),
          add(S(y=W[j-15],7) ^ S(y,18) ^ (y>>>3),  W[j - sixteen])
        );

        a.unshift(
          add(
            y=add(
              add(
                add(a.pop(),  S(b=a[4],6) ^ S(b,11) ^ S(b,25)),
                add((b&a[5]) ^ ((~b)&a[6]),  K[j])
              ),
              W[j++]
            ),
            add(S(l=a[0],2) ^ S(l,13) ^ S(l,22),  (l&a[1]) ^ (a[1]&a[2]) ^ (a[2]&l))
          )
        );
      }

      for(j=8;j--;) HASH[j] = add(a[j],HASH[j]);
    }

    for(s='';j<63;) s += ((HASH[++j>>3]>>4*(7-j%8))&15).toString(sixteen);
    callback(s);
  }
  /* END SHA256 STUFF */

  // eval in global scope is hard, inject a script tag
  // http://perfectionkills.com/global-eval-what-are-the-options/
  //var geval = window.execScript || eval;
  /**
   * inject javascript code into the dom
   * @param {string} javascript code to insert
   */
  function injectJS(code) {
    /* http://www.jspatterns.com/the-ridiculous-case-of-adding-a-script-element/ */
    var s = doc.createElement('script');
    s.type = 'text/javascript';
    s.text = code;
    var first = doc.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(s, first);
  }

/*ifdef*/if(WITH_CSS){
  /**
   * inject css into the dom
   * @param {string} css to insert
   */
  function injectCSS(css) {
    var c = doc.createElement('style');
    c.type = 'text/css';
    if (c.styleSheet){
      c.styleSheet.cssText = css;
    } else {
      c.appendChild(doc.createTextNode(css));
    }
    doc.getElementsByTagName('head')[0].appendChild(c);
  }
/*endif*/}

  /** @const */ var PENDING   = 0;
  __VerifyJS['PENDING']     = PENDING;
  /** @const */ var VERIFIED  = 1;
  __VerifyJS['VERIFIED']    = VERIFIED;
  /** @const */ var SUCCESS   = 2;
  __VerifyJS['SUCCESS']     = SUCCESS;
  /** @const */ var E_LOAD    = 3
  __VerifyJS['E_LOAD']      = E_LOAD;
  /** @const */ var E_HASH    = 4;
  __VerifyJS['E_HASH']      = E_HASH;
  /** @const */ var E_TIMEOUT = 5;
  __VerifyJS['E_TIMEOUT']   = E_TIMEOUT;
  /** @const */ var E_PARSE   = 6;
  __VerifyJS['E_PARSE']     = E_PARSE;

  function reExtractFirst(s, r) {
    return (r.exec(s)||[])[1];
  }

  function noop(){}

  var cache = {};
  var queue = __VerifyJS['queue'] = [];

/*ifdef*/if(WITH_DEBUG) {
  __VerifyJS['__cache'] = cache;
/*endif*/}

  /**
   * the main 'loader' function
   * @param {string} the uri to load from
   * @param {string} the expected hash of the resource
   * @param {?function(Object)} callback function to be called with the result
   *        object as an argument when there is an event.
   * @param {?boolean} if true, the resource will have its hash checked but
   *        will not be inserted into the dom until inject() called on the
   *        result object.
   * @return {!Object} the result object
   */
  __VerifyJS['load'] = function(uri, hash, callback, deferInject) {
    var ret = {
      'uri': uri,
      'result': PENDING,
      'inject': function() { throw 'E_INJECT';}
    };
    var xhr;
/*ifdef*/if(WITH_CSS){
    var ext = reExtractFirst(uri, /\.(js|css)(\?|$)/);
/*endif*/}

    callback = callback || noop;

    /**
     * we do this a lot, stuff it in a function
     * @param {function()}
     */
    function set_inject(inject) { ret['inject'] = inject; };

    /**
     * callback wrapper generator
     * @param {number} result code
     * @return {function()} wrapped callback function
     */
    function wrapped_callback(r) {
      return function() {
        xhr = null;
        ret['result'] = r;
        callback(ret);
      };
    };

    /**
     * check if a hash has already been loaded and possibly deal with it
     * @param {string} hash to check
     * @return {bool} whether the hash has already been loaded
     */
    function is_already_loaded(h) {
      if (h in cache) {
        if (deferInject) {
          /* need to do this via setTimeout so that we can be added to the queue */
          window.setTimeout(wrapped_callback(VERIFIED), 4);
          set_inject(wrapped_callback(SUCCESS));
        } else {
          wrapped_callback(SUCCESS)();
        }
        return true;
      } else {
        return false;
      }
    }
    /* fail if we have no hash or if there was a previous attempt to load this
     * uri with a different hash value. If we have CSS support, also make sure
     * there was a valid extension. */
    if ((WITH_CSS && !ext) || !hash || (uri in cache && hash !== cache[uri])) {
      wrapped_callback(E_PARSE)();
    } else {
      cache[uri] = hash;
      /* if we already loaded this, bail */
      if (is_already_loaded(hash)) { return ret; }

      /* https://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/ */
      try {
        xhr = new XMLHttpRequest();
        if ('withCredentials' in xhr) {
          xhr.open('GET', uri, true);
        } else {
          /* this will throw an excpetion (which we handle) if we can't make a
           * CORS request with XDR either. */
          xhr = new XDomainRequest();
          xhr.open('GET', uri);
        }
      } catch(e) {
        wrapped_callback(E_LOAD)();
        return ret;
      }
      xhr.onerror = xhr.onabort = wrapped_callback(E_LOAD);
      xhr.ontimeout = wrapped_callback(E_TIMEOUT);
      xhr.onprogress = noop; /* old ie may act up without this */
      xhr.onload = function() {
        var r = xhr.responseText;
        __VerifyJS['hash'](r, function(hash2) {
          ret['hash'] = hash2;
          if (hash2 === hash) {
/*ifdef*/if(WITH_CSS){
            if (is_already_loaded(hash)) {
              return ret;
            } else {
              set_inject(function() {
                cache[hash2] = 1;
                if (ext === 'css') {
                  injectCSS(r);
                } else { /* assume js if it's not css */
                  injectJS(r);
                }
                set_inject(noop);
                wrapped_callback(SUCCESS)();
                r = xhr; /* clear r, xhr should be nulled by wrapped_callback */
              });
            }
/*else*/}else{
            if (is_already_loaded(hash)) {
              return ret;
            } else {
              set_inject(function() {
                cache[hash2] = 1;
                injectJS(r);
                set_inject(noop);
                wrapped_callback(SUCCESS)();
                r = xhr; /* clear r, xhr should be nulled by wrapped_callback */
              });
            }
/*endif*/}
            if (deferInject) {
              wrapped_callback(VERIFIED)();
            } else {
              ret['inject']();
            }
          } else {
            wrapped_callback(E_HASH)();
            r = xhr; /* clear r, xhr should be nulled by wrapped_callback */
          }
        });
      };
      xhr.timeout = 10 * 1000; /* 10 seconds */
      xhr.send();
      return ret;
    };
  }

  /**
   * Add a script to the load queue. Scripts start downloading right away then
   * get injected in the order they were added, waiting for prior scripts.
   * @param {string} the uri to load from
   * @param {string} the expected hash of the resource
   * @param {?function(Object)} callback function to be called with the result
   *        object as an argument when there is an event.
   */
  __VerifyJS['add'] = function(uri, hash, callback) {
    queue.push(__VerifyJS['load'](uri, hash, function(data) {
      callback(data);
      while (queue.length && queue[0]['result'] === VERIFIED) {
        (queue.shift())['inject']();
      }
    }, true));
  };

  /**
   * Specify a callback to be run once everything in the queue has loaded.
   * @param {function()} callback function
   */
  __VerifyJS['done'] = function(callback) {
    if (queue.length) {
      queue.push({'result': VERIFIED, 'inject': callback});
    } else {
      callback();
    }
  }

  return __VerifyJS;
})();
/*
vim: ts=2 sw=2 et ai si
*/
