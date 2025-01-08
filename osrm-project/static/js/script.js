// 전역 변수 선언부
let map;                    // Google Maps 객체를 저장할 변수
let startMarker = null;     // 출발지 마커
let endMarker = null;       // 도착지 마커
let routeLine = null;       // 경로를 그릴 선
let clickCount = 0;         // 사용자의 클릭 횟수를 추적 (0: 시작전, 1: 출발지 선택됨, 2: 도착지까지 선택됨)
let geocoder;               // 주소 <-> 좌표 변환을 위한 Google Geocoder 객체

/**
 * Google Maps에서 사용하는 인코딩된 경로 문자열을 좌표 배열로 변환하는 함수
 * [실습 난이도: 상] - 다양한 비트 연산자와 문자열 디코딩 알고리즘을 이해할 수 있음
 * 
 * @param {string} str - 인코딩된 경로 문자열
 * @param {number} precision - 좌표의 정확도 (기본값: 5)
 * @returns {Array} 디코딩된 좌표 배열 [[경도, 위도], ...]
 */
function decodePolyline(str, precision = 5) {
    let index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision);

    while (index < str.length) {
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lng / factor, lat / factor]);
    }

    return coordinates;
}

/**
 * Google Maps를 초기화하고 현재 위치를 중심으로 지도를 표시하는 함수
 * [실습 난이도: 하] - 지도 초기화와 현재 위치 가져오기 기능 학습
 * 실습 포인트: 
 * 1. 초기 중심점 좌표 변경해보기
 * 2. 초기 줌 레벨 조정해보기
 * 3. 현재 위치 가져오기 실패시 대체 동작 추가하기
 */
function initMap() {
    geocoder = new google.maps.Geocoder();
    
    // 기본 위치(분당구)로 먼저 지도 초기화
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: { lat: 37.335339, lng: 127.092088 }
    });

    // HTML5 Geolocation API를 사용하여 사용자의 현재 위치 가져오기
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(pos);
            },
            (error) => {
                console.error('Geolocation failed:', error);
            }
        );
    }

    // 지도 클릭 이벤트 리스너 등록
    map.addListener('click', function(e) {
        handleMapClick(e.latLng);
    });
}

/**
 * 주소 검색 처리 함수
 * [실습 난이도: 하] - 주소 검색과 마커 표시 기능 학습
 * 실습 포인트:
 * 1. 마커 스타일 변경하기 (색상, 라벨 등)
 * 2. 검색 결과가 없을 때의 에러 메시지 커스터마이징
 * 
 * @param {string} type - 검색 타입 ('start' 또는 'end')
 */
function searchLocation(type) {
    const searchInput = document.getElementById(type + 'Search').value;
    
    geocoder.geocode({ address: searchInput }, (results, status) => {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            
            if (type === 'start') {
                if (startMarker) startMarker.setMap(null);
                startMarker = new google.maps.Marker({
                    position: location,
                    map: map,
                    title: '시작점',
                    label: 'S'
                });
                map.setCenter(location);
                clickCount = Math.max(1, clickCount);
            } else {
                if (endMarker) endMarker.setMap(null);
                endMarker = new google.maps.Marker({
                    position: location,
                    map: map,
                    title: '도착점',
                    label: 'E'
                });
                clickCount = 2;
            }

            // 출발지와 도착지가 모두 설정되었다면 경로 검색
            if (startMarker && endMarker) {
                getRoute(startMarker.getPosition(), endMarker.getPosition());
            }
        } else {
            alert('주소를 찾을 수 없습니다: ' + status);
        }
    });
}

/**
 * 지도 클릭 이벤트 처리 함수
 * [실습 난이도: 중] - 클릭 이벤트 처리와 마커 관리 학습
 * 실습 포인트:
 * 1. 마커 아이콘 커스터마이징
 * 2. 클릭 시 애니메이션 효과 추가
 * 
 * @param {google.maps.LatLng} latLng - 클릭된 위치의 좌표
 */
function handleMapClick(latLng) {
    if (clickCount === 0) {
        // 첫 번째 클릭: 출발지 마커 설정
        if (startMarker) startMarker.setMap(null);
        startMarker = new google.maps.Marker({
            position: latLng,
            map: map,
            title: '시작점',
            label: 'S'
        });
        document.getElementById('instructions').innerHTML = '<p>도착점을 클릭하세요.</p>';
        clickCount = 1;
        
        // 클릭한 위치의 주소 가져오기
        getAddressFromLatLng(latLng, 'start');
    } else if (clickCount === 1) {
        // 두 번째 클릭: 도착지 마커 설정
        if (endMarker) endMarker.setMap(null);
        endMarker = new google.maps.Marker({
            position: latLng,
            map: map,
            title: '도착점',
            label: 'E'
        });
        getRoute(startMarker.getPosition(), endMarker.getPosition());
        clickCount = 2;
        
        // 클릭한 위치의 주소 가져오기
        getAddressFromLatLng(latLng, 'end');
    }
}

/**
 * 좌표를 주소로 변환하는 함수 (역지오코딩)
 * [실습 난이도: 하] - 역지오코딩 API 활용 학습
 * 실습 포인트:
 * 1. 주소 포맷 변경하기
 * 2. 상세 주소 정보 활용하기
 * 
 * @param {google.maps.LatLng} latLng - 변환할 좌표
 * @param {string} type - 주소 타입 ('start' 또는 'end')
 */
function getAddressFromLatLng(latLng, type) {
    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK') {
            if (results[0]) {
                document.getElementById(type + 'Search').value = results[0].formatted_address;
            }
        }
    });
}

/**
 * 경로 검색 API 호출 함수
 * [실습 난이도: 중] - API 통신과 에러 처리 학습
 * 실습 포인트:
 * 1. 로딩 인디케이터 추가
 * 2. 에러 처리 세분화
 * 
 * @param {google.maps.LatLng} start - 출발지 좌표
 * @param {google.maps.LatLng} end - 도착지 좌표
 */
function getRoute(start, end) {
    const url = `/route/${start.lng()}/${start.lat()}/${end.lng()}/${end.lat()}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.code === 'Ok') {
                drawRoute(data.routes[0]);
                displayRouteInfo(data.routes[0]);
            } else {
                alert('경로를 찾을 수 없습니다.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('경로 요청 중 오류가 발생했습니다.');
        });
}

/**
 * 경로 정보 표시 함수
 * [실습 난이도: 하] - DOM 조작과 데이터 표시 학습
 * 실습 포인트:
 * 1. 추가 경로 정보 표시 (예: 도보/자전거 시간)
 * 2. 정보 표시 스타일링
 * 
 * @param {Object} route - 경로 정보 객체
 */
function displayRouteInfo(route) {
    const routeInfo = document.getElementById('routeInfo');
    const distance = (route.distance / 1000).toFixed(1); // km로 변환
    const duration = Math.round(route.duration / 60); // 분으로 변환
    
    routeInfo.style.display = 'block';
    routeInfo.innerHTML = `
        <h3>경로 정보</h3>
        <p>총 거리: ${distance} km</p>
        <p>예상 소요 시간: ${duration} 분</p>
    `;
}

/**
 * 경로를 지도에 그리는 함수
 * [실습 난이도: 중] - 지도 위 도형 그리기 학습
 * 실습 포인트:
 * 1. 경로선 스타일 변경 (색상, 두께 등)
 * 2. 경로 애니메이션 효과 추가
 * 
 * @param {Object} route - 경로 정보 객체
 */
function drawRoute(route) {
    if (routeLine) routeLine.setMap(null);
    
    const coordinates = decodePolyline(route.geometry);
    const path = coordinates.map(coord => ({
        lat: coord[1],
        lng: coord[0]
    }));

    routeLine = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
    });
}

/**
 * 모든 지도 요소를 초기화하는 함수
 * [실습 난이도: 하] - 상태 초기화 학습
 * 실습 포인트:
 * 1. 초기화 애니메이션 추가
 * 2. 확인 대화상자 추가
 */
function resetPoints() {
    if (startMarker) startMarker.setMap(null);
    if (endMarker) endMarker.setMap(null);
    if (routeLine) routeLine.setMap(null);
    startMarker = null;
    endMarker = null;
    routeLine = null;
    clickCount = 0;
    document.getElementById('instructions').innerHTML = '<p>지도에서 시작점과 도착점을 클릭하세요.</p>';
    document.getElementById('startSearch').value = '';
    document.getElementById('endSearch').value = '';
    document.getElementById('routeInfo').style.display = 'none';
}