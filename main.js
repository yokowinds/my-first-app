// 获取DOM元素
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const resultText = document.getElementById('resultText');
const loadingText = document.getElementById('loadingText');

// 存储上传的图片文件
let uploadedFiles = [];

// 拖拽上传相关事件
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropZone.classList.add('dragover');
}

function unhighlight(e) {
    dropZone.classList.remove('dragover');
}

// 处理文件拖放
dropZone.addEventListener('drop', handleDrop, false);
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            alert('请只上传图片文件！');
            return false;
        }
        // 检查文件大小（5MB限制）
        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过5MB！');
            return false;
        }
        return true;
    });

    // 检查总文件数
    if (uploadedFiles.length + validFiles.length > 9) {
        alert('最多只能上传9张图片！');
        return;
    }

    // 添加新文件到数组
    uploadedFiles = [...uploadedFiles, ...validFiles];
    updateImagePreview();
    updateButtonState();
}

function updateImagePreview() {
    imagePreview.innerHTML = '';
    uploadedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="预览图片">
                <button class="delete-btn" data-index="${index}">×</button>
            `;
            imagePreview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });

    // 为删除按钮添加事件监听
    setTimeout(() => {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                uploadedFiles.splice(index, 1);
                updateImagePreview();
                updateButtonState();
            });
        });
    }, 100);
}

function updateButtonState() {
    generateBtn.disabled = uploadedFiles.length === 0;
    copyBtn.disabled = !resultText.textContent;
}

// API配置
const SERVER_URL = 'http://localhost:5001/api/generate';  // 使用新端口

// 将图片转换为base64
async function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 生成文案功能
generateBtn.addEventListener('click', async () => {
    try {
        if (uploadedFiles.length === 0) {
            alert('请先上传图片');
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = '正在生成...';
        resultText.textContent = '正在生成文案，请稍候...';

        // 将所有图片转换为base64
        const base64Images = await Promise.all(
            Array.from(uploadedFiles).map(file => imageToBase64(file))
        );

        // 发送请求到服务器
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                images: base64Images
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        resultText.textContent = data.caption || '生成失败，请重试';

    } catch (error) {
        console.error('生成文案时出现错误：', error);
        resultText.textContent = `生成文案时出现错误：${error.message}`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '生成文案';
    }
});

// 复制文案功能
copyBtn.addEventListener('click', () => {
    const text = resultText.textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('文案已复制到剪贴板！');
    }).catch(() => {
        alert('复制失败，请手动复制文案。');
    });
});
