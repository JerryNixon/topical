import { MemoryStorage, ConsoleAdapter } from 'botbuilder';
import { Topic, Culture, NumberPrompt, prettyConsole, WSTelemetry, Prompt, hasText, consoleOnTurn, doTopic, PromptArgs } from '../src/topical';

async function prompter (
    this: Prompt<any, string>
) {
    await this.send(this.state.args!);
}

class PromptForCulture extends Prompt<string> {

    validator = hasText
        .and((activity, text) => Culture.getSupportedCultureCodes().includes(text) || 'unsupported_culture');
}
PromptForCulture.register();

class FavoriteNumber extends Topic  {

    async onStart() {
        await this.next();
    }

    async next() {
        await this.startChild(PromptForCulture, {
            prompt: `Please pick a culture (${Culture.getSupportedCultureCodes().join(', ')}).`
        });
    }

    async onDispatch() {
        if (this.text)
            await this.dispatchToChild();
    }

    async onChildEnd(child: Topic) {
        if (child instanceof PromptForCulture) {
            await this.startChild(NumberPrompt, {
                prompt: `What's your favorite number?`
            }, child.return!.result.value!);
        } else if (child instanceof NumberPrompt) {
            await this.send(`${child.return!.result.value}? That's my favorite too!`);
            await this.next();
        }
    }
}
FavoriteNumber.register();

// const wst = new WSTelemetry('ws://localhost:8080/server');
// Topic.telemetry = action => wst.send(action);

Topic.init(new MemoryStorage());

consoleOnTurn(
    new ConsoleAdapter()
        .use(prettyConsole),
    context => doTopic(FavoriteNumber, context)
);