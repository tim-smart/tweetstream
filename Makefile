
test:
	@for i in test/*.js; do \
		node $$i; \
	done


GJSLINT = PYTHONPATH=tools/closure_linter/ \
	python tools/closure_linter/closure_linter/gjslint.py \
	--unix_mode --strict --nojsdoc

lint:
	@$(GJSLINT) -r lib/ -r test/

.PHONY: test lint