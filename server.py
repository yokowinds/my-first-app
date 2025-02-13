from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
import json
import base64
import re

# 获取当前文件所在的目录作为静态文件目录
current_dir = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_url_path='', static_folder=current_dir)
CORS(app)  # 启用跨域支持

# API配置
API_KEY = 'dc953400-a714-4798-802f-ea970d0a2c0f'
API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

def extract_base64_data(data_url):
    """从data URL中提取base64数据"""
    if data_url.startswith('data:'):
        # 如果是data URL格式，提取base64部分
        base64_data = data_url.split(',', 1)[1]
        return base64_data
    return data_url

def convert_to_base64(image_url):
    """将图片URL转换为base64格式"""
    try:
        if image_url.startswith('data:'):
            # 如果已经是base64格式，直接提取base64部分
            return extract_base64_data(image_url)
        
        # 如果是本地文件路径
        if image_url.startswith('file://'):
            image_path = image_url[7:]  # 移除 'file://' 前缀
            with open(image_path, 'rb') as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        
        # 如果是网络URL，先下载
        elif image_url.startswith(('http://', 'https://')):
            response = requests.get(image_url)
            response.raise_for_status()
            return base64.b64encode(response.content).decode('utf-8')
        
        return image_url
    except Exception as e:
        print(f"转换图片到base64时出错: {str(e)}")
        return image_url

@app.route('/')
def home():
    return send_from_directory(current_dir, 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory(current_dir, path)

@app.route('/api/generate', methods=['POST'])
def generate_caption():
    try:
        # 获取前端发送的数据
        data = request.json
        images = data.get('images', [])
        
        # 将图片转换为base64格式
        base64_images = [convert_to_base64(img) for img in images]
        
        # 构建消息内容
        messages = [
            {
                "role": "system",
                "content": """你是一个专业的小红书文案撰写专家。请根据用户上传的图片生成一段吸引人的小红书风格文案。

要求：
1. 文案长度50字以内
2. 积极正向、充满活力
3. 符合图片内容
4. 有感染力和分享欲
5. 适当使用emoji表情，让文案更活泼可爱
6. 使用小红书常见的表达方式，如"绝绝子"、"yyds"等
7. 可以用"#"加话题标签作为结尾

示例格式：
✨今日份的幸福感get！☀️
这样的午后时光也太治愈了吧～
不负好时光，享受生活的每一刻💝
#生活碎片 #记录幸福"""
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "请为这些图片生成一段朋友圈文案"
                    }
                ] + [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{img}"
                        }
                    } for img in base64_images
                ]
            }
        ]
        
        # 构建请求数据
        request_data = {
            "model": "ep-20250213103204-424h6",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 150,
            "stream": False
        }
        
        print("准备发送请求到火山引擎 API...")
        print(f"请求数据: {json.dumps(request_data, ensure_ascii=False, indent=2)}")
        
        # 设置请求头
        headers = {
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # 发送请求
        response = requests.post(
            API_ENDPOINT,
            headers=headers,
            json=request_data,
            timeout=30
        )
        
        print(f"响应状态码: {response.status_code}")
        print(f"响应头: {response.headers}")
        
        # 如果请求成功
        if response.ok:
            response_data = response.json()
            print(f"API 响应: {json.dumps(response_data, ensure_ascii=False, indent=2)}")
            
            # 提取生成的文案
            generated_text = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            return jsonify({
                'caption': generated_text,
                'raw_response': response_data
            })
        else:
            error_msg = f"API 返回错误: {response.status_code} - {response.text}"
            print(error_msg)
            return jsonify({'error': error_msg}), 500
    
    except Exception as e:
        error_msg = f"服务器错误: {str(e)}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500

if __name__ == '__main__':
    # 本地开发时使用
    app.run(host='0.0.0.0', port=5001, debug=True)
