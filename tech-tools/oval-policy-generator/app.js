document.getElementById('checkApiKey').addEventListener('click', checkApiKey);
document.getElementById('useCustomModel').addEventListener('change', toggleModel);
const apiKeyCheckmark = document.getElementById('apiCheckmark');
const apiKeyInput = document.getElementById('apiKey');

let conversationId = null;
let useCustomModel = false;
let generatedOVALPolicy = false;

async function toggleModel() {
    useCustomModel = document.getElementById('useCustomModel').checked;
    const customModelInput = document.getElementById('customModel');
    customModelInput.disabled = !useCustomModel;
}

async function checkApiKey() {
    const apiKey = apiKeyInput.value.trim();

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    };
    const url = "https://api.openai.com/v1/completions";
    const data = {
        "prompt": "Test API key",
        "model": "text-davinci-003",
        "max_tokens": 1,
        "n": 1,
        "stop": null,
        "temperature": 0.5
    };

    const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
    });

    const checkmark = document.getElementById('apiCheckmark');
    const crossmark = document.getElementById('apiCrossmark');
    if (response.ok) {
        checkmark.style.visibility = "visible";
        crossmark.style.visibility = "hidden";
        alert('API key is valid!');
    } else {
        checkmark.style.visibility = "hidden";
        crossmark.style.visibility = "visible";
        crossmark.style.color = "red";
        alert('Invalid API key. Please enter a valid key and try again.');
    }
}

async function generateOVALPolicy() {
    const userQuery = document.getElementById('userQuery').value;
    const ovalOutput = document.getElementById('ovalOutput');
    const copyButton = document.getElementById('copyButton');
    const apiKey = apiKeyInput.value.trim();

    copyButton.addEventListener('click', () => {
        ovalOutput.select();
        document.execCommand('copy');
    });

    const trainingPromptDirect = `Training conversation:
    user: [Use a "Direct" OVAL internal abstraction, which is based on the "official" OVAL format. 
    Direct OVAL building blocks:
    1. The built-in Host Rules defined by third-party vendors (such as CIS) are written in OVAL. Every Rule is represented as a definition based on these main sections: Metadata, Criteria/Criterion, Test, Object, and State. The correlation between the sections is predicated on internal ID references. In Direct OVAL, the correlation between the sections is predicated on hierarchy and code structure, without the need to reference every ID in the Rule code.
    
    2. For <criteria> and <criterion>, ONLY one of the following is expected:
    - unsupported_test
    - family_test
    - dpkginfo_test
    - rpminfo_test
    - partition_test
    - password_test
    - shadow_test
    - variable_test
    - registry_test
    - file_test
    - textfilecontent54_test
    - passwordpolicy_test
    - sql57_test
    - lockoutpolicy_test

    - registry_test info:
    Value 'HKLM' is not in the enumeration list. It must be one of the following:
    - HKEY_CLASSES_ROOT
    - HKEY_CURRENT_CONFIG
    - HKEY_CURRENT_USER
    - HKEY_LOCAL_MACHINE
    - HKEY_USERS

 - registry_object info NEEDS to contain either name or name_variable

- registry_state NEEDS to be: One of the following is expected:
- hive
- hive_variable
- key
- key_variable
- name
- name_variable
- last_write_time
- last_write_time_variable
- type
- type_variable
- value
- value_variable
- windows_view
- windows_view_variable

 - value_type:
 One of the following is expected:
 - hive
 - hive_variable
 - key
 - key_variable
 - name
 - name_variable
 - last_write_time
 - last_write_time_variable
 - type
 - type_variable
 - value
 - value_variable
 - windows_view
 - windows_view_variable

    3. Host Configuration Rule evaluation (fail or pass)
    A Host Configuration Rule defines a specific misconfiguration pattern, that if detected, the rule evaluation fails and a Finding is created for the given resource. For all other possible combinations in which the misconfiguration pattern is not detected, the rule evaluation passes and no Findings are generated for the given resource.
    
    There are two opposite methods to accomplish this fail/pass methodology:
    
    Search for secure resources: Develop an OVAL rule that looks for the desired configuration pattern. Resources matching this pattern will pass, while resources not matching this pattern will fail and generate Findings.
    Search for misconfigured resources: Develop an OVAL rule that uses the "negate," "OR," and "AND" operators to identify unwanted configuration patterns. Resources matching these patterns will fail and generate Findings, while resources not matching these patterns will pass.
    You cannot skip results
    
    As you can define a criteria for Fail and Pass only, make sure your Host Configuration Rule includes the scenario(s) in which the rule should be skipped, i.e. when the object configuration your are examining does not exist on, or is irrelevant to, the resource in the first place.
    
    The following is an example of a Host Configuration Rule that identifies the docker.service file is present in the /usr/lib/systemd/and its ownership is set, correctly, to root:root. Following the search for secure resources methodology, this rule is set to:
    
    FailIf the docker.service file is present in the /usr/lib/systemd/ path, and its ownership is not set to root:root.
    PassIf the docker.service file is either absent from the evaluated resource, or its ownership is correctly set to root:root.
    
    XML:
    <definition xmlns="https://wiz.io/XMLSchema/direct-schema">
      <metadata>
        <title>Ensure 'docker.service' file ownership is set to the root user/group</title>
        <description>The 'docker.service' file ownership must be set to 'root:root'.</description>
      </metadata>
      <criteria operator="or">
        <criterion>
          <file_test check_existence="at_least_one_exists" check="all">
            <file_object comment="Ensure /usr/lib/systemd/system/docker.service exists and is owned by user 0 and group 0">
              <filepath>/usr/lib/systemd/system/docker.service</filepath>
            </file_object>
            <file_state>
              <group_id datatype="int">0</group_id>
              <user_id datatype="int">0</user_id>
            </file_state>
          </file_test>
        </criterion>
        <criterion>
          <file_test check_existence="none_exist" check="all">
            <file_object comment="Ensure /usr/lib/systemd/system/docker.service does not exist">
              <filepath>/usr/lib/systemd/system/docker.service</filepath>
            </file_object>
          </file_test>
        </criterion>
      </criteria>
    </definition>
    ]
    assistant: [Sounds good! I'll
    
]

assistant: [Sounds good! I'll follow those guidelines.]
`;

    const prompt = `${trainingPromptDirect}\nWrite a "Direct" OVAL policy using the user-q "${userQuery}"\nReturn only the Direct OVAL policy starting with "<definition xmlns="https://wiz.io/XMLSchema/direct-schema">"`;
    const model = useCustomModel ? document.getElementById('customModel').value.trim() : 'text-davinci-003';
    const response = await fetchChatGPT(prompt, apiKey, model);
    ovalOutput.value = response.choices[0].text.trim();
    generatedOVALPolicy = true;
    updateFollowUpInputState();
}

function updateFollowUpInputState() {
    const followUpInput = document.getElementById('followUpInput');
    followUpInput.disabled = !generatedOVALPolicy;
}

updateFollowUpInputState();

async function fetchChatGPT(prompt, apiKey, model, includeConversationHistory = true) {
    let useCustomModel = document.getElementById("useCustomModel").checked;
    let url;
    let data;

    if (useCustomModel) {
        url = "https://api.openai.com/v1/completions";
        data = {
            "prompt": prompt,
            "model": model,
            "max_tokens": 200,
            "n": 1,
            "stop": null,
            "temperature": 0.5
        };
    } else {
        url = "https://api.openai.com/v1/completions";
        data = {
            "prompt": prompt,
            "model": model,
            "max_tokens": 400,
            "n": 1,
            "stop": null,
            "temperature": 0.5
        };
    }

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    };

    const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
    });

    if (response.ok) {
        return await response.json();
    } else {
        throw new Error(`Error: ${response.status}`);
    }
}

async function sendFollowUp() {
    const followUpInput = document.getElementById('followUpInput').value;
    const apiKey = apiKeyInput.value.trim();

    if (!followUpInput) {
        alert('Please enter a follow-up request and try again.');
        return;
    }

    const initialPolicy = document.getElementById('ovalOutput').value.trim();
    const prompt = `Initial Rego policy:\n${initialPolicy}\n\nFollow-up request: ${followUpInput}\nPlease provide an updated Rego policy based on the follow-up request.\n`;
    const model = useCustomModel ? document.getElementById('customModel').value.trim() : 'text-davinci-003';
    const response = await fetchChatGPT(prompt, apiKey, model, false); // Pass 'false' to omit conversation history
    const updatedPolicy = response.choices[0].text.trim();
    const ovalOutput = document.getElementById('ovalOutput');
    ovalOutput.value += `\n────────────────────────────────────────\n\n${updatedPolicy}`; // Append the updated policy below the separator line
}

document.getElementById('generateOvalPolicy').addEventListener('click', async function() {
    document.getElementById('loading').style.display = 'flex';
    try {
        await generateOVALPolicy();
    } catch (error) {
        console.error(error);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
});

document.getElementById('sendFollowUp').addEventListener('click', async function() {
    document.getElementById('loading').style.display = 'flex';
    try {
        await sendFollowUp();
    } catch (error) {
        console.error(error);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
});
