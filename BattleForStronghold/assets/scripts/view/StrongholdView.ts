import { EventTouch, Label, Node, tween, Tween, UITransform, Vec3 } from 'cc';
import { FACTION_LABEL, FOCUS_DURATION, FOCUS_SCALE, GameText, PRESS_DURATION, PRESS_SCALE } from '../config/GameConfig';
import { StrongholdState } from '../model/StrongholdState';
import { StrongholdId } from '../types/GameTypes';

/**
 * 绑定场景里已经摆好的一座城和它的信息节点。
 * 只改文字、标记和缩放，不创建节点，也不改图片。
 */
export class StrongholdView {
    readonly id: StrongholdId;
    readonly body: Node;

    private readonly info: Node;
    private readonly factionLabel: Label;
    private readonly troopLabel: Label;
    private readonly sourceMark: Node;
    private readonly targetMark: Node;
    private readonly baseScale: Vec3;
    private readonly onClick: (id: StrongholdId) => void;
    private sourceOn = false;
    private targetOn = false;
    private focused = false;

    constructor(body: Node, info: Node, id: StrongholdId, onClick: (id: StrongholdId) => void) {
        this.body = body;
        this.info = info;
        this.id = id;
        this.onClick = onClick;
        this.factionLabel = this.requireLabel(info, 'Faction');
        this.troopLabel = this.requireLabel(info, 'Troops');
        this.sourceMark = this.requireChild(info, 'SourceMark');
        this.targetMark = this.requireChild(info, 'TargetMark');
        this.baseScale = body.scale.clone();
        this.placeMarksAboveName();
        body.on(Node.EventType.TOUCH_END, this.handleTouch, this);
        info.on(Node.EventType.TOUCH_END, this.handleTouch, this);
    }

    /** Name 里已经写好的城名。脚本不改它。 */
    get currentName(): string {
        return this.requireLabel(this.info, 'Name').string;
    }

    /** 刷新阵营和兵力。不改名称、图片和位置。 */
    render(state: StrongholdState): void {
        this.factionLabel.string = FACTION_LABEL[state.faction];
        this.troopLabel.string = `${GameText.troopPrefix} ${state.troops}`;
    }

    /** 空闲态点按反馈：在场景原始缩放上缩到 0.94 倍再回来。 */
    playPress(): void {
        Tween.stopAllByTarget(this.body);
        this.body.setScale(this.baseScale);
        const pressed = this.scaled(PRESS_SCALE);
        tween(this.body)
            .to(PRESS_DURATION, { scale: pressed })
            .to(PRESS_DURATION, { scale: this.baseScale })
            .start();
    }

    /** 行军或交战中的焦点：保持原始缩放的 1.1 倍。不另加光晕。 */
    setFocused(on: boolean): void {
        if (this.focused === on) {
            return;
        }
        this.focused = on;
        Tween.stopAllByTarget(this.body);
        tween(this.body)
            .to(FOCUS_DURATION, { scale: on ? this.scaled(FOCUS_SCALE) : this.baseScale })
            .start();
    }

    /** 用来源标记表示当前出兵城。重复设置同一个状态时不改节点。 */
    setSourceHighlight(on: boolean): void {
        if (this.sourceOn === on) {
            return;
        }
        this.sourceOn = on;
        this.sourceMark.active = on;
    }

    /** 用目标标记表示当前目标城。 */
    setTargetHighlight(on: boolean): void {
        if (this.targetOn === on) {
            return;
        }
        this.targetOn = on;
        this.targetMark.active = on;
    }

    /** 停掉缩放并回到场景里的原始值，同时藏起来源和目标标记。 */
    resetVisual(): void {
        Tween.stopAllByTarget(this.body);
        this.body.setScale(this.baseScale);
        this.focused = false;
        this.sourceOn = false;
        this.targetOn = false;
        this.sourceMark.active = false;
        this.targetMark.active = false;
    }

    /** 解除点击。不销毁场景节点。 */
    dispose(): void {
        this.resetVisual();
        this.body.off(Node.EventType.TOUCH_END, this.handleTouch, this);
        this.info.off(Node.EventType.TOUCH_END, this.handleTouch, this);
    }

    /** 标记原来在信息节点中心，会盖住城的图片。改到城名上方。 */
    private placeMarksAboveName(): void {
        const nameNode = this.requireChild(this.info, 'Name');
        const height = nameNode.getComponent(UITransform)?.height ?? 28;
        const y = nameNode.position.y + height / 2 + 18;
        this.sourceMark.setPosition(nameNode.position.x, y, 0);
        this.targetMark.setPosition(nameNode.position.x, y, 0);
    }

    private handleTouch(event: EventTouch): void {
        event.propagationStopped = true;
        this.onClick(this.id);
    }

    private scaled(factor: number): Vec3 {
        return new Vec3(this.baseScale.x * factor, this.baseScale.y * factor, this.baseScale.z);
    }

    private requireChild(parent: Node, name: string): Node {
        const child = parent.getChildByName(name);
        if (!child) {
            throw new Error(`${parent.name} 缺少 ${name}`);
        }
        return child;
    }

    private requireLabel(parent: Node, name: string): Label {
        const label = this.requireChild(parent, name).getComponent(Label);
        if (!label) {
            throw new Error(`${parent.name}/${name} 缺少 Label`);
        }
        return label;
    }
}
