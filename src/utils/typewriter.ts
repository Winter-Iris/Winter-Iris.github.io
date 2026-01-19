export class TypewriterEffect {
    private element: HTMLElement;
    private texts: string[];
    private currentTextIndex: number = 0;
    private speed: number;
    private deleteSpeed: number;
    private pauseTime: number;
    private currentIndex: number = 0;
    private isDeleting: boolean = false;
    private timeoutId: number | null = null;

    private textFetcher?: () => Promise<string>;

    // 修改构造函数：支持传入配置对象，方便手动调用
    constructor(element: HTMLElement, options?: {
            text?: string | string[], 
            speed?: number, 
            deleteSpeed?: number, 
            pauseTime?: number,
            textFetcher?: () => Promise<string>
        }) {
        this.element = element;
        this.textFetcher = options?.textFetcher;
        // 优先使用传入的配置，如果没有则读取 DOM 上的 data 属性
        const textData = options?.text || element.dataset.text || '';
        
        if (Array.isArray(textData)) {
            this.texts = textData;
        } else {
            try {
                const parsed = JSON.parse(textData as string);
                this.texts = Array.isArray(parsed) ? parsed : [textData as string];
            } catch {
                this.texts = [textData as string];
            }
        }

        this.speed = options?.speed ?? parseInt(element.dataset.speed || '100');
        this.deleteSpeed = options?.deleteSpeed ?? parseInt(element.dataset.deleteSpeed || '50');
        this.pauseTime = options?.pauseTime ?? parseInt(element.dataset.pauseTime || '2000');

        if ( (this.texts.length > 1 || this.textFetcher) && !this.isTypewriterEnabled()) {
            this.showRandomText();
        } else {
            this.start();
        }
    }

    private isTypewriterEnabled(): boolean {
        return this.element.dataset.speed !== undefined ||
               this.element.dataset.deleteSpeed !== undefined || 
               this.element.dataset.pauseTime !== undefined;
    }

    private showRandomText() {
        if (this.texts.length === 0) return;
        const randomIndex = Math.floor(Math.random() * this.texts.length);
        this.element.textContent = this.texts[randomIndex];
    }

    private start() {
        if (this.texts.length === 0) return;
        this.element.textContent = ''; // 确保开始时为空
        this.type();
    }

    private getCurrentText(): string {
        return this.texts[this.currentTextIndex] || '';
    }

    private type() {
        const currentText = this.getCurrentText();
        if (this.isDeleting) {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.element.textContent = currentText.substring(0, this.currentIndex);
                this.timeoutId = window.setTimeout(() => this.type(), this.deleteSpeed);
            } else {
                this.isDeleting = false;
                // 如果有获取器，去获取新的一言
                if (this.textFetcher) {
                    this.textFetcher().then(newText => {
                        this.texts = [newText]; // 更新文本库
                        this.currentTextIndex = 0;
                        this.type(); // 重新开始打字
                    });
                    return; // 暂停循环，等待网络请求
                }
                // 否则执行原有的静态循环逻辑
                this.currentTextIndex = (this.currentTextIndex + 1) % this.texts.length;
                this.timeoutId = window.setTimeout(() => this.type(), this.speed);
            }
        } else {
            if (this.currentIndex < currentText.length) {
                this.currentIndex++;
                this.element.textContent = currentText.substring(0, this.currentIndex);
                this.timeoutId = window.setTimeout(() => this.type(), this.speed);
            } else {
                if (this.texts.length > 1 || this.textFetcher) {
                    this.isDeleting = true;
                    this.timeoutId = window.setTimeout(() => this.type(), this.pauseTime);
                }
            }
        }
    }

    public destroy() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }
}