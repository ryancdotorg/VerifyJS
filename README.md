VerifyJS
========
**Load JavaScript from a CDN, no trust required!**

VerifyJS is yet another asyncronous JavaScript/CSS loader with a unique
feature - it guarantees that the asset you're loading hasn't been tampered
with or otherwise modified without your knowledge. This is acomplished by
providing it with both a asset's location and a cryptographic checksum of
its content.

**Important:** Please review the license. It places some restrictions on use
and distribution to encourage secure configurations. Also note that this is
not yet a stable release.

Features
--------
* Asyncronously load JS and CSS
* Execute either 'in-order' or 'as soon as ready'
* Specify callbacks for various events (success, verified, error,
  timeout, etc) and/or when everything has loaded
* Broad browser support - works with mobile browsers, Safari, Chrome,
  Firefox and IE8+
* Small - less than 2.5KB minified, 1.5KB gzipped
* Known to work with cdnjs and jsdelivr
* Ensure that assets are not executed more than once
* Verify asset content with sha256 and execute only if it matchs

Limitations
-----------
* In order to see the content of an asset before injecting it, a XMLHTTPRequest
(or on older versions of IE, XDomainRequest) must be used. This requires
the server you're loading an asset from to send CORS headers, which many don't.
* The security gain is very specific - you get to load assets from somewhere
  that you don't entierly trust. In particular, VerifyJS cannot be counted
  on to protect against malicious modification to your page, whether by a
  man-in-the-middle or someone pwning your server.
* Using it with 'the latest version' of anything or assets that are likely to
  change without notice will end in tears.
* To give a specific example, loading google analytics isn't be supported by
  VerifyJS. You can load it without VerifyJS but you must then trust that
  it will neither do anything evil nor be tampered with in transit.
* VerifyJS cannot protect against assets you load in turn requesting other
  assets.
* VerifyJS's sha256 implementation is optimized for small size, not speed.
  In newer browsers this shouldn't be a problem. In IE8 you may get the "slow
  script warning" trying to load even a moderatly large (25-50KB) asset. If you
  need to support IE8, please see the examples section.

Usage and Examples
------------------

Load VerifyJS (include):

    <script type="text/javascript" src="verify-min.js"></script>

Load VerifyJS (inline):

    <script>
    VerifyJS=function(){...(copy/paste the code)
    </script>

A global VerifyJS object will be created, no need to do anything with `new`.

If you're going to be loading scripts that are more than 10-20KB and care
about supporting IE8, include a snippet like this right after you load
VerifyJS, otherwise you're likely to trigger a 'slow script' warning.

    <!-- https://github.com/ryancdotorg/async-sha256-js -->
    <!--[if lte IE 8]>
    <script type="text/javascript" src="async-sha256-min.js"></script>
    <script>
    (function(){
      var sha256 = new AsyncSha256();
      VerifyJS.hash = function(m, c) {
        sha256.adigest(m, c);
      };
    })();
    </script>
    <![endif]-->

Define a basic callback handler that logs to the console:

    <script>
    var logger = function(data) {
      var file = data.uri.split('/').slice(-1);
      var msg = 'VerifyJS: ';
      switch(data.result) {
        /* only triggered via VerifyJS.add() */
        case VerifyJS.VERIFIED:
          msg += 'Download and verification of ' + file + ' successful.';
          break;
        case VerifyJS.SUCCESS:
          msg += 'Successfully loaded ' + file + ' into the DOM.';
          break;
        case VerifyJS.E_HASH:
          msg += 'Content for ' + file + ' did not match the specified hash! ';
          msg += 'Got ' + data.hash + '.';
          break;
        /* no special handling for E_LOAD, E_TIMEOUT, or E_PARSE */
        case default:
          msg += 'Failed to load ' + file + '!';
          break;
       }
       console.log(msg);
    }
    </script>

Load a script and inject it into the DOM as soon as it finishes loading:

    VerifyJS.load('//cdnjs.cloudflare.com/ajax/libs/Base64/0.2.1/base64.min.js',
                  'dd840cf1948276189475392e2fe0f4a8a336d6708f320d08358df6fbdf22f990',
                  logger);

Load jQuery and some plugins with in-order execution, and an 'everything finished' callback:

    VerifyJS.add('http://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.0/jquery.js',
                 'ce0343e1d6f489768eeefe022c12181c6a0822e756239851310acf076d23d10c',
                 logger);
    VerifyJS.add('//cdn.jsdelivr.net/jquery.serializejson/1.2.3/jquery.serializejson.min.js',
                 'ff82686aeec7776efeee93f6bd9013b23a58f012db59bd071ea0130b4fe71c14',
                 logger);
    VerifYJS.add('http://cdnjs.cloudflare.com/ajax/libs/jquery.qrcode/1.0/jquery.qrcode.min.js',
                 'f4ccf02b69092819ac24575c717a080c3b6c6d6161f1b8d82bf0bb523075032d',
                 logger);
    VerifyJS.done(function() {
      $('body').text('Everything has loaded successfully!');
    });

If you're using the standard version (verify-min.js, not verify-nocss-min.js), loading stylesheets will work as well.

Objections
----------
* [Javascript Cryptography Considered Harmful](http://www.matasano.com/articles/javascript-cryptography/)!

I almost entirely agree with that article. Let me be *very* clear about what
VerifyJS offers: preventing a malicious or pwned CDN from passing you Evil
code. Nothing more, but that alone is useful.

* The NSA can break sha256!

I doubt it, but it doesn't matter. They have far more convenient ways to mess
with you using their arsenal of 0day exploits.

* Bitcoin ASICs will break sha256!

To do a preimage attack on sha256 through brute force requires an average of
2^255 hash operations. In a day the bitcoin network currently does on the
order of 2^74 hash operations per day. Doing 2^255 sha256 operations would
require 2^255/2^74 = 2^181 days. That is about a trillion times longer than
our estimates of how long we have until the sun burns out.

* Your license is weird!

VerifyJS is a security tool, and I wish to ensure that it is used correctly.
Enforcing that via technical measures would be difficult so I have prohibited
some of the more egregiously wrong ways to use it in the license. If you have
a good use case that you feel the license disallows please contact me and I
will try to work something out with you.
