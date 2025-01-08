# 2025_jeju_mobility_osrm

1. docker 설치 & 회원가입
2. https://download.geofabrik.de/asia.html
에서 South Korea	 =>  [.osm.pbf] 다운
3. osrm-local 폴더 생성 후 south-korea-latest.osm.pbf 파일 넣기

4. osrm-local 폴더 경로에서 powersell 실행

docker run -t -v "${PWD}:/data" yeahwonzena/osrm-backend-jeju-custom osrm-extract -p /opt/car.lua /data/south-korea-latest.osm.pbf

docker run -t -v "${PWD}:/data" yeahwonzena/osrm-backend-jeju-custom osrm-partition /data/south-korea-latest.osrm

docker run -t -v "${PWD}:/data" yeahwonzena/osrm-backend-jeju-custom osrm-customize /data/south-korea-latest.osrm

docker run -t -i -p 5000:5000 -v "${PWD}:/data" yeahwonzena/osrm-backend-jeju-custom osrm-routed --algorithm mld /data/south-korea-latest.osrm
