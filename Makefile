CLOSURE_WHITESPACE=closure --compilation_level WHITESPACE_ONLY
CLOSURE_SIMPLE=closure --compilation_level SIMPLE_OPTIMIZATIONS
CLOSURE_ADVANCED=closure --compilation_level ADVANCED_OPTIMIZATIONS

CLOSURE=$(CLOSURE_ADVANCED)

DIST=dist

TARGETS=$(DIST)/verify-min.js $(DIST)/verify-nocss-min.js

.PHONY: all

all: $(TARGETS)

$(DIST)/verify-min.js: verify.js
	$(CLOSURE) -D WITH_DEBUG=false --js $< --js_output_file $@

$(DIST)/verify-nocss-min.js: verify.js
	$(CLOSURE) -D WITH_DEBUG=false -D WITH_CSS=false --js $< --js_output_file $@

clean:
	rm $(TARGETS) dist/* 2> /dev/null || true
