export interface AnswerMap {
    [index: string]: any;
}

/**
 * Represents a tree of questions that can be used to build up a template context
 */
export interface QuestionTree {
    /**
     * The text that the user is shown before waiting for answer input
     */
    prompt: string;

    /**
     * The name of the question, also used as a variable name in the resulting
     * template context
     */
    name: string;

    /**
     * An optional list of options for multiple-choice questions.
     */
    options?: QuestionOption[];

    /**
     * Transformation and validation function that can be used for both free
     * form and multiple choice question types.
     *
     * @param transformerValidator a function that transforms valid input to
     * the answer data desired and throws on invalid input. Mutates the given
     * AnswerMap as needed. Returns a follow-up question, if necessary. Can be
     * async.
     */
    transformerValidator?: (rawInput: any, answers: AnswerMap) => Promise<QuestionTree | undefined> | QuestionTree | undefined;
}

/**
 * Represents a single option in a list of options for a multiple choice
 * question.
 */
export interface QuestionOption {
    /**
     * The text shown to the user to describe this option.
     */
    label: string;

    /**
     * The value that should be used when this option is selected. If the
     * question also contains a transformerValidator, this is data will be
     * passed as rawInput.
     */
    value: any;

    /**
     * The follow-up question that should be given to the user after this one,
     * if applicable.
     */
    nextQuestion?: QuestionTree;

    /**
     * Whether or not this option should be the default if no other option is
     * selected.
     */
    default?: boolean;
}

const _outputDirQuestion: QuestionTree = {
    name: "outputPath",
    prompt: "Where should we create the config files for this network? Please\n" +
    "choose either an empty directory, or a path to a new directory that does\n" +
    "not yet exist. Default: ./quorum-test-network",
    transformerValidator: (rawInput: string, answers: AnswerMap) => {
        // TODO: add some more checks to make sure that the path is valid
        if (rawInput) {
            answers.outputPath = rawInput;
        } else {
            answers.outputPath = "./quorum-test-network";
        }

        // this is a no-op, but it makes the TS compiler happy :-/
        return undefined;
    }
};

const _orchestrateQuestion: QuestionTree = {
    name: "orchestrate",
    prompt: "Do you want to include support for Orchestrate? [Y/n]",
};
// have to add this below the definition because of the self reference..
_orchestrateQuestion.transformerValidator = _getYesNoValidator(_orchestrateQuestion, _outputDirQuestion, "y");

const _privacyQuestion: QuestionTree = {
    name: "privacy",
    prompt: "Do you wish to enable support for private transactions? [Y/n]",
};
// have to add this below the definition because of the self reference..
_privacyQuestion.transformerValidator = _getYesNoValidator(_privacyQuestion, _orchestrateQuestion, "y");

export const rootQuestion: QuestionTree = {
    name: "clientType",
    prompt: "Which Ethereum client would you like to run? Default: [1]",
    options: [
        // TODO: fix these to the correct names
        { label: "Hyperledger Besu", value: "besu", nextQuestion: _privacyQuestion, default: true },
        { label: "GoQuorum", value: "gquorum", nextQuestion: _privacyQuestion }
    ]
};

function _getYesNoValidator(question: QuestionTree, nextQuestion?: QuestionTree, defaultResponse?: "y" | "n" ) {
    return (rawInput: string, answers: AnswerMap) => {
        const normalizedInput = rawInput.toLowerCase();

        if (defaultResponse && !normalizedInput) {
            answers[question.name] = defaultResponse === "y";
            return nextQuestion;
        } else if (normalizedInput === "y" || normalizedInput === "n") {
            answers[question.name] = normalizedInput === "y";
            return nextQuestion;
        } else {
            return question;
        }
    };
}