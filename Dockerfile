ARG BASE_IMAGE=653380732738.dkr.ecr.ap-south-1.amazonaws.com/node20:20.11.1-alpine
FROM ${BASE_IMAGE} As build

LABEL Merchant-Node-apisversion="1.0.0.0" \
      contact="Vouchagram India" \
      description="A minimal Node.js Docker image for Merchant-Node-apis application in Staging" \
      base.image="Node" \
      maintainer="raj.r@gyftr.com"

# Set the timezone to Indian Standard Time (IST)
ENV TZ=Asia/Kolkata

# Update the container's timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone


RUN mkdir -p /app

WORKDIR /app

ADD . / /app/

RUN npm install
FROM 653380732738.dkr.ecr.ap-south-1.amazonaws.com/node20:20.11.1-alpine
COPY --from=build /app .
ADD . .
# Set a non-root user for enhanced security
# Note: "node" is a built-in non-root user in the official Node.js Alpine image
#USER node

# Expose the port on which your Node.js application listens
EXPOSE 3735

# Define a health check for your Node.js application
# This example assumes that your application exposes a health check endpoint at /health
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl --fail https://brandpts.gyftr.net/health-check || exit 1


# Start the Node.js application
#CMD ["npm", "run", "start"]
