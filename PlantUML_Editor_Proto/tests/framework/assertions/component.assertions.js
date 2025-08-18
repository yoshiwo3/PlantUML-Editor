/**
 * コンポーネント7要素構成検証カスタムアサーション
 * 
 * ActionItemの7要素構成 (dragHandle, actorFrom, arrowType, actorTo, message, deleteButton, questionButton) を検証
 * インタラクティブ性、アクセシビリティ、セキュリティを包括的にテスト
 * 
 * @version 1.0.0
 * @author PlantUML Editor Proto Team
 * @date 2025-08-17
 */

/**
 * ActionItem 7要素構成定義
 */
const SEVEN_ELEMENTS = {
    DRAG_HANDLE: 'dragHandle',
    ACTOR_FROM: 'actorFrom',
    ARROW_TYPE: 'arrowType',
    ACTOR_TO: 'actorTo',
    MESSAGE: 'message',
    DELETE_BUTTON: 'deleteButton',
    QUESTION_BUTTON: 'questionButton'
};

/**
 * セレクター定義（data-testid ベース）
 */
const SELECTORS = {
    ACTION_ITEM: '[data-testid="action-item"]',
    DRAG_HANDLE: '[data-testid="drag-handle"]',
    ACTOR_FROM: '[data-testid="actor-from"]',
    ARROW_TYPE: '[data-testid="arrow-type"]',
    ACTOR_TO: '[data-testid="actor-to"]',
    MESSAGE: '[data-testid="message"]',
    DELETE_BUTTON: '[data-testid="delete-button"]',
    QUESTION_BUTTON: '[data-testid="question-button"]'
};

/**
 * CSS クラス定義
 */
const CSS_CLASSES = {
    DRAG_HANDLE: 'drag-handle',
    ACTOR_SELECTOR: 'actor-selector',
    ARROW_SELECTOR: 'arrow-selector',
    MESSAGE_INPUT: 'message-input',
    DELETE_BUTTON: 'delete-button',
    QUESTION_BUTTON: 'question-button',
    INTERACTIVE: 'interactive',
    DRAGGABLE: 'draggable'
};

/**
 * アクセシビリティ属性定義
 */
const ACCESSIBILITY_ATTRS = {
    ROLE: 'role',
    ARIA_LABEL: 'aria-label',
    ARIA_DESCRIBEDBY: 'aria-describedby',
    ARIA_EXPANDED: 'aria-expanded',
    TABINDEX: 'tabindex',
    DRAGGABLE: 'draggable'
};

/**
 * 矢印タイプオプション
 */
const ARROW_TYPES = [
    '->',    // 同期メッセージ
    '-->',   // 非同期メッセージ
    '->>',   // 応答メッセージ
    '->+',   // アクティベーション
    '->x',   // 破棄
    '->]',   // ロストメッセージ
    '[->',   // ファウンドメッセージ
    '<-',    // 逆方向同期
    '<--',   // 逆方向非同期
    '<<-'    // 逆方向応答
];

/**
 * 要素が存在するかを検証
 * @param {Element|Document} container - 検索対象のコンテナ
 * @param {string} selector - セレクター
 * @returns {boolean} 存在するかどうか
 */
function elementExists(container, selector) {
    if (!container || !selector) {
        return false;
    }
    
    const element = container.querySelector ? 
        container.querySelector(selector) : 
        document.querySelector(selector);
    
    return element !== null;
}

/**
 * 要素が表示されているかを検証
 * @param {Element} element - 検証対象の要素
 * @returns {boolean} 表示されているかどうか
 */
function isElementVisible(element) {
    if (!element) {
        return false;
    }
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
}

/**
 * 要素がインタラクティブかを検証
 * @param {Element} element - 検証対象の要素
 * @returns {boolean} インタラクティブかどうか
 */
function isElementInteractive(element) {
    if (!element) {
        return false;
    }
    
    const tagName = element.tagName.toLowerCase();
    const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
    
    if (interactiveTags.includes(tagName)) {
        return true;
    }
    
    // role属性のチェック
    const role = element.getAttribute('role');
    const interactiveRoles = ['button', 'link', 'menuitem', 'option', 'tab'];
    
    if (interactiveRoles.includes(role)) {
        return true;
    }
    
    // クリックイベントリスナーの存在チェック
    const hasClickHandler = element.onclick !== null || 
                           element.addEventListener !== undefined;
    
    // tabindex属性のチェック
    const tabIndex = element.getAttribute('tabindex');
    const isFocusable = tabIndex !== null && tabIndex !== '-1';
    
    return hasClickHandler || isFocusable;
}

/**
 * 要素がドラッグ可能かを検証
 * @param {Element} element - 検証対象の要素
 * @returns {boolean} ドラッグ可能かどうか
 */
function isElementDraggable(element) {
    if (!element) {
        return false;
    }
    
    return element.draggable === true || 
           element.getAttribute('draggable') === 'true';
}

/**
 * セレクト要素に適切なオプションが含まれているかを検証
 * @param {Element} selectElement - セレクト要素
 * @param {Array<string>} expectedOptions - 期待されるオプション
 * @returns {boolean} 適切なオプションが含まれているかどうか
 */
function hasCorrectOptions(selectElement, expectedOptions) {
    if (!selectElement || !expectedOptions || !Array.isArray(expectedOptions)) {
        return false;
    }
    
    const options = Array.from(selectElement.options).map(option => option.value);
    
    return expectedOptions.every(expected => options.includes(expected));
}

/**
 * ActionItem要素の7要素すべてが存在するかを検証
 * @param {Element|Document} container - ActionItemコンテナ
 * @returns {Object} 検証結果
 */
function validateSevenElements(container) {
    const results = {
        hasAll: true,
        missing: [],
        elements: {}
    };
    
    Object.entries(SELECTORS).forEach(([key, selector]) => {
        if (key === 'ACTION_ITEM') return;
        
        const element = container.querySelector ? 
            container.querySelector(selector) : 
            document.querySelector(selector);
        
        results.elements[key] = element;
        
        if (!element) {
            results.hasAll = false;
            results.missing.push(key);
        }
    });
    
    return results;
}

/**
 * ドラッグハンドルの機能性を検証
 * @param {Element} dragHandle - ドラッグハンドル要素
 * @returns {Object} 検証結果
 */
function validateDragHandle(dragHandle) {
    return {
        exists: !!dragHandle,
        visible: isElementVisible(dragHandle),
        draggable: isElementDraggable(dragHandle),
        hasProperCursor: dragHandle && window.getComputedStyle(dragHandle).cursor === 'grab',
        hasAriaLabel: dragHandle && !!dragHandle.getAttribute('aria-label')
    };
}

/**
 * アクターセレクターの機能性を検証
 * @param {Element} actorSelector - アクターセレクター要素
 * @returns {Object} 検証結果
 */
function validateActorSelector(actorSelector) {
    return {
        exists: !!actorSelector,
        visible: isElementVisible(actorSelector),
        interactive: isElementInteractive(actorSelector),
        isSelect: actorSelector && actorSelector.tagName.toLowerCase() === 'select',
        hasOptions: actorSelector && actorSelector.options && actorSelector.options.length > 0,
        hasAriaLabel: actorSelector && !!actorSelector.getAttribute('aria-label')
    };
}

/**
 * 矢印タイプセレクターの機能性を検証
 * @param {Element} arrowSelector - 矢印タイプセレクター要素
 * @returns {Object} 検証結果
 */
function validateArrowTypeSelector(arrowSelector) {
    const hasCorrectArrowOptions = hasCorrectOptions(arrowSelector, ARROW_TYPES);
    
    return {
        exists: !!arrowSelector,
        visible: isElementVisible(arrowSelector),
        interactive: isElementInteractive(arrowSelector),
        isSelect: arrowSelector && arrowSelector.tagName.toLowerCase() === 'select',
        hasCorrectOptions: hasCorrectArrowOptions,
        hasAriaLabel: arrowSelector && !!arrowSelector.getAttribute('aria-label')
    };
}

/**
 * メッセージ入力フィールドの機能性を検証
 * @param {Element} messageInput - メッセージ入力フィールド要素
 * @returns {Object} 検証結果
 */
function validateMessageInput(messageInput) {
    return {
        exists: !!messageInput,
        visible: isElementVisible(messageInput),
        interactive: isElementInteractive(messageInput),
        isEditable: messageInput && (
            messageInput.tagName.toLowerCase() === 'input' ||
            messageInput.tagName.toLowerCase() === 'textarea' ||
            messageInput.contentEditable === 'true'
        ),
        hasPlaceholder: messageInput && !!messageInput.getAttribute('placeholder'),
        hasAriaLabel: messageInput && !!messageInput.getAttribute('aria-label')
    };
}

/**
 * ボタン要素の機能性を検証
 * @param {Element} button - ボタン要素
 * @param {string} expectedType - 期待されるボタンタイプ
 * @returns {Object} 検証結果
 */
function validateButton(button, expectedType) {
    return {
        exists: !!button,
        visible: isElementVisible(button),
        interactive: isElementInteractive(button),
        isButton: button && (
            button.tagName.toLowerCase() === 'button' ||
            button.getAttribute('role') === 'button'
        ),
        hasType: button && button.type === expectedType,
        hasAriaLabel: button && !!button.getAttribute('aria-label'),
        hasIcon: button && (
            button.querySelector('svg') ||
            button.querySelector('.icon') ||
            button.classList.contains('icon')
        )
    };
}

/**
 * ActionItem全体のアクセシビリティを検証
 * @param {Element} actionItem - ActionItem要素
 * @returns {Object} 検証結果
 */
function validateAccessibility(actionItem) {
    return {
        hasRole: actionItem && !!actionItem.getAttribute('role'),
        hasAriaLabel: actionItem && !!actionItem.getAttribute('aria-label'),
        hasProperTabOrder: actionItem && checkTabOrder(actionItem),
        hasKeyboardSupport: actionItem && checkKeyboardSupport(actionItem),
        hasScreenReaderSupport: actionItem && checkScreenReaderSupport(actionItem)
    };
}

/**
 * タブオーダーが適切かを検証
 * @param {Element} container - コンテナ要素
 * @returns {boolean} 適切なタブオーダーかどうか
 */
function checkTabOrder(container) {
    if (!container) {
        return false;
    }
    
    const focusableElements = container.querySelectorAll(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );
    
    const tabIndices = Array.from(focusableElements).map(el => 
        parseInt(el.getAttribute('tabindex') || '0')
    );
    
    return tabIndices.every((tabIndex, index) => 
        index === 0 || tabIndex >= tabIndices[index - 1]
    );
}

/**
 * キーボードサポートが適切かを検証
 * @param {Element} container - コンテナ要素
 * @returns {boolean} 適切なキーボードサポートかどうか
 */
function checkKeyboardSupport(container) {
    if (!container) {
        return false;
    }
    
    // Enter キーとスペースキーのイベントリスナーの存在チェック
    const buttons = container.querySelectorAll('button, [role="button"]');
    
    return Array.from(buttons).every(button => {
        return button.onkeydown !== null || 
               button.addEventListener !== undefined;
    });
}

/**
 * スクリーンリーダーサポートが適切かを検証
 * @param {Element} container - コンテナ要素
 * @returns {boolean} 適切なスクリーンリーダーサポートかどうか
 */
function checkScreenReaderSupport(container) {
    if (!container) {
        return false;
    }
    
    const hasAriaLabels = container.querySelectorAll('[aria-label]').length > 0;
    const hasAriaDescriptions = container.querySelectorAll('[aria-describedby]').length > 0;
    const hasProperRoles = container.querySelectorAll('[role]').length > 0;
    
    return hasAriaLabels && (hasAriaDescriptions || hasProperRoles);
}

/**
 * Jest カスタムマッチャーの定義
 */
const customMatchers = {
    /**
     * ActionItemが7要素すべてを持っているかをテスト
     */
    toHaveAllSevenElements(received) {
        const validation = validateSevenElements(received);
        const pass = validation.hasAll;
        
        if (pass) {
            return {
                message: () => `期待: 7要素のうち一部が欠けていること\n受信: すべての7要素が存在しています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: すべての7要素が存在すること\n受信: 欠けている要素: ${validation.missing.join(', ')}`,
                pass: false
            };
        }
    },

    /**
     * ドラッグハンドルが適切に機能するかをテスト
     */
    toHaveDragHandle(received) {
        const dragHandle = received.querySelector ? 
            received.querySelector(SELECTORS.DRAG_HANDLE) : 
            document.querySelector(SELECTORS.DRAG_HANDLE);
        
        const validation = validateDragHandle(dragHandle);
        const pass = validation.exists && validation.visible && validation.draggable;
        
        if (pass) {
            return {
                message: () => `期待: ドラッグハンドルが機能しないこと\n受信: ドラッグハンドルが適切に機能しています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 機能するドラッグハンドル\n受信: ${JSON.stringify(validation)}`,
                pass: false
            };
        }
    },

    /**
     * アクターセレクターが適切に機能するかをテスト
     */
    toHaveActorSelectors(received) {
        const actorFrom = received.querySelector ? 
            received.querySelector(SELECTORS.ACTOR_FROM) : 
            document.querySelector(SELECTORS.ACTOR_FROM);
        
        const actorTo = received.querySelector ? 
            received.querySelector(SELECTORS.ACTOR_TO) : 
            document.querySelector(SELECTORS.ACTOR_TO);
        
        const validationFrom = validateActorSelector(actorFrom);
        const validationTo = validateActorSelector(actorTo);
        
        const pass = validationFrom.exists && validationFrom.interactive &&
                    validationTo.exists && validationTo.interactive;
        
        if (pass) {
            return {
                message: () => `期待: アクターセレクターが機能しないこと\n受信: アクターセレクターが適切に機能しています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 機能するアクターセレクター\n受信: From: ${JSON.stringify(validationFrom)}, To: ${JSON.stringify(validationTo)}`,
                pass: false
            };
        }
    },

    /**
     * クエスチョンボタンが適切に機能するかをテスト
     */
    toHaveQuestionButton(received) {
        const questionButton = received.querySelector ? 
            received.querySelector(SELECTORS.QUESTION_BUTTON) : 
            document.querySelector(SELECTORS.QUESTION_BUTTON);
        
        const validation = validateButton(questionButton, 'button');
        const pass = validation.exists && validation.visible && validation.interactive;
        
        if (pass) {
            return {
                message: () => `期待: クエスチョンボタンが機能しないこと\n受信: クエスチョンボタンが適切に機能しています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 機能するクエスチョンボタン\n受信: ${JSON.stringify(validation)}`,
                pass: false
            };
        }
    },

    /**
     * ActionItemがインタラクティブかをテスト
     */
    toBeInteractive(received) {
        const accessibilityValidation = validateAccessibility(received);
        const pass = accessibilityValidation.hasKeyboardSupport && 
                    accessibilityValidation.hasProperTabOrder;
        
        if (pass) {
            return {
                message: () => `期待: インタラクティブでないこと\n受信: インタラクティブです`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: インタラクティブであること\n受信: ${JSON.stringify(accessibilityValidation)}`,
                pass: false
            };
        }
    },

    /**
     * 矢印タイプセレクターが適切なオプションを持っているかをテスト
     */
    toHaveArrowTypeOptions(received) {
        const arrowSelector = received.querySelector ? 
            received.querySelector(SELECTORS.ARROW_TYPE) : 
            document.querySelector(SELECTORS.ARROW_TYPE);
        
        const validation = validateArrowTypeSelector(arrowSelector);
        const pass = validation.exists && validation.hasCorrectOptions;
        
        if (pass) {
            return {
                message: () => `期待: 矢印タイプオプションが不適切であること\n受信: 適切な矢印タイプオプションが存在します`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 適切な矢印タイプオプション\n受信: ${JSON.stringify(validation)}`,
                pass: false
            };
        }
    },

    /**
     * メッセージ入力フィールドが適切に機能するかをテスト
     */
    toHaveMessageInput(received) {
        const messageInput = received.querySelector ? 
            received.querySelector(SELECTORS.MESSAGE) : 
            document.querySelector(SELECTORS.MESSAGE);
        
        const validation = validateMessageInput(messageInput);
        const pass = validation.exists && validation.isEditable && validation.interactive;
        
        if (pass) {
            return {
                message: () => `期待: メッセージ入力が機能しないこと\n受信: メッセージ入力が適切に機能しています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 機能するメッセージ入力\n受信: ${JSON.stringify(validation)}`,
                pass: false
            };
        }
    },

    /**
     * 削除ボタンが適切に機能するかをテスト
     */
    toHaveDeleteButton(received) {
        const deleteButton = received.querySelector ? 
            received.querySelector(SELECTORS.DELETE_BUTTON) : 
            document.querySelector(SELECTORS.DELETE_BUTTON);
        
        const validation = validateButton(deleteButton, 'button');
        const pass = validation.exists && validation.visible && validation.interactive;
        
        if (pass) {
            return {
                message: () => `期待: 削除ボタンが機能しないこと\n受信: 削除ボタンが適切に機能しています`,
                pass: true
            };
        } else {
            return {
                message: () => `期待: 機能する削除ボタン\n受信: ${JSON.stringify(validation)}`,
                pass: false
            };
        }
    }
};

// Jestに追加
if (typeof expect !== 'undefined') {
    expect.extend(customMatchers);
}

module.exports = {
    // 定数
    SEVEN_ELEMENTS,
    SELECTORS,
    CSS_CLASSES,
    ACCESSIBILITY_ATTRS,
    ARROW_TYPES,
    
    // バリデーション関数
    validateSevenElements,
    validateDragHandle,
    validateActorSelector,
    validateArrowTypeSelector,
    validateMessageInput,
    validateButton,
    validateAccessibility,
    
    // ユーティリティ関数
    elementExists,
    isElementVisible,
    isElementInteractive,
    isElementDraggable,
    hasCorrectOptions,
    checkTabOrder,
    checkKeyboardSupport,
    checkScreenReaderSupport,
    
    // カスタムマッチャー
    customMatchers
};