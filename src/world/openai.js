import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);

export async function promptFunctions(prompt, functions) {
  console.log('Prompting GPT-3:\n----------------\n' + prompt);

  let completion;
  while (true) {
    try {
      completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-0613",
        messages: [{ role: "user", content: prompt }],
        functions,
      });
      break;
    } catch (e) {
      console.log(e.response.data.error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
      //return;
    }
  }

  const { function_call } = completion.data.choices[0].message;

  if (!function_call)
    return {
      name: 'doNothing',
      arguments: {},
    };

  try {
    function_call.arguments = JSON.parse(function_call.arguments);
  } catch (error) {
    console.error('Error parsing arguments: ' + error);
    console.log(function_call.arguments);
    return {
      name: 'doNothing',
      arguments: {},
    };
  }

  return function_call;
};