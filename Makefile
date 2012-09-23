PUBLIC_DIR=server/public/
OUT_DIR=server/public/out/
COMPILER=build/compiler.jar
COMPILER_ZIP=build/compiler.zip

build: _build_thirdparty _build_clientside_js _collect_html_assets
	
getCompiler:
	@echo "getting google closure-compiler"
	@curl -o ${COMPILER_ZIP} --trace-time 'http://closure-compiler.googlecode.com/files/compiler-latest.zip' 
	@echo "unzipping compiler"
	@cd build/
	@unzip ${COMPILER_ZIP}
	@echo "cleaning up"
	@rm COPYING
	@rm README
	@cd ../

_build_thirdparty:
	@echo "building third-party javascript"
	@cat ${PUBLIC_DIR}third-party/jquery.min.js > ${OUT_DIR}thirdparty.js
	@cat ${PUBLIC_DIR}third-party/mustache.js >> ${OUT_DIR}thirdparty.js
	@cat ${PUBLIC_DIR}third-party/Three45/ThreeWebGL.js >> ${OUT_DIR}thirdparty.js
	@cat ${PUBLIC_DIR}third-party/Three45/ThreeExtras.js >> ${OUT_DIR}thirdparty.js
	@cat ${PUBLIC_DIR}third-party/Three/RequestAnimationFrame.js >> ${OUT_DIR}thirdparty.js
	@cat ${PUBLIC_DIR}third-party/Three/Detector.js >> ${OUT_DIR}thirdparty.js
	@java -jar build/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --use_types_for_optimization --warning_level QUIET --third_party --js_output_file ${OUT_DIR}thirdparty.min.js ${OUT_DIR}thirdparty.js
	@rm ${OUT_DIR}thirdparty.js

_build_clientside_js:
	@echo "building clientside javascript"
	@cat ${PUBLIC_DIR}js/globe.js > ${OUT_DIR}index.js
	@cat ${PUBLIC_DIR}js/index.js >> ${OUT_DIR}index.js
	@java -jar build/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --use_types_for_optimization --warning_level QUIET --externs ${OUT_DIR}thirdparty.min.js --third_party --js_output_file ${OUT_DIR}index.min.js ${OUT_DIR}index.js
	@rm ${OUT_DIR}index.js

_collect_html_assets:
	@echo "collecting presentation assets"
	@cp ${PUBLIC_DIR}index.html ${OUT_DIR}index.html
	@cat ${PUBLIC_DIR}/css/*.css > ${OUT_DIR}/style.css
	@cp ${PUBLIC_DIR}*.jpg ${OUT_DIR}
	@cp ${PUBLIC_DIR}*.gif ${OUT_DIR}