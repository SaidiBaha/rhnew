#FROM maven:3.9.6-eclipse-temurin-17 AS build
#
#WORKDIR /app
#COPY . .
#RUN mvn clean package -DskipTests
#
#FROM eclipse-temurin:17-jre-alpine
#
#WORKDIR /app
#
#COPY --from=build /app/target/*.jar app.jar
#
#RUN apk add --no-cache curl
#
#EXPOSE 9000
#
## Health check
#HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
#  CMD curl -f http://localhost:9000/actuator/health || exit 1
#
#ENTRYPOINT ["java", "-jar", "app.jar"]

FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 9000

# Health check avec wget (inclus nativement dans Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9000/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]