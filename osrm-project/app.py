from flask import Flask, render_template, jsonify
import requests

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/route/<start_lon>/<start_lat>/<end_lon>/<end_lat>')
def get_route(start_lon, start_lat, end_lon, end_lat):
    # OSRM 서버에 요청
    url = f'http://127.0.0.1:5000/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}?steps=true'
    response = requests.get(url)
    return jsonify(response.json())

if __name__ == '__main__':
    app.run(port=5001, debug=True)