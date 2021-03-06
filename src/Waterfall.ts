import { TurnContext } from "botbuilder";
import { Topic, Prompt, ValidatorResult } from "./topical";

export interface WaterfallState {
    stepIndex: number;
}

export type Step = (value?: any) => Promise<any>;

export abstract class Waterfall <
    Start = any,
    State extends WaterfallState = WaterfallState,
    Return = any,
    Context extends TurnContext = TurnContext
> extends Topic <Start, State, Return, Context> {

    result?: ValidatorResult<any>;

    async runWaterfall (
        getSteps: (next: (value?: any) => void) => Step[]
    ) {
        if (this.state.stepIndex === undefined)
            this.state.stepIndex = 0;

        let next = true;
        let value: any = undefined;

        const steps = getSteps(
            (_value) => {
                next = true;
                value = _value;
            }
        );

        if (this.hasStartedChildren) {
            next = false;
            this.result = undefined;

            await this.dispatchToChild();

            if (this.result) {
                next = true;
                value = this.result!.value;
            }
        }
    
        while (next && this.state.stepIndex < steps.length) {
            next = false;

            await steps[this.state.stepIndex ++](value);

            if (this.ended)
                return true;

            if (this.hasStartedChildren)
                next = false;
        }

        return this.state.stepIndex >= steps.length;    
    }

    async onStart() {
        await this.onDispatch();
    }

    async onDispatch() {
        if ((await this.runWaterfall(next => this.waterfall(next))) && !this.ended)
            await this.end();
    }

    async onChildEnd (child: Prompt<any, any, Context>) {
        if (child instanceof Prompt) {
            this.result = child.return!.result;
        }
    }

    waterfall(next: (value?: any) => void): Step[] {
        return [];
    }
}

