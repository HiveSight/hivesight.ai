.PHONY: check-types build deploy

check-types:
	# Run TypeScript compiler in noEmit mode to check for errors without generating files
	npx tsc --noEmit

build:
	# Your existing build command, e.g., building your React app
	npm run build

deploy: check-types build
	# You can add deployment commands here if needed
	echo "Deployment steps go here"