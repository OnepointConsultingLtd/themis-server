const { execSync } = require('child_process');


/* Validation error example :
valError "[[1,89]: [ERR 102] Line 1:89 mismatched input '$$$$$' in rule \"FIN-V0-001 [V0-CRITICAL]werwerewwer w SubmissionType not recognised or registered\"]\r\n"
*/
function parseErrors(stdout) {
  // Parse the errors
  const errorsRegexPattern = /(?:\[[0-9]+,[0-9]+\]: \[ERR [0-9]*\] Line [0-9]+:[0-9]+\s.*?)(?=,\s\[[0-9]+,[0-9]+\]|\]$)+/gm; // expecting an /r/n ending character
  console.log('Matching: ', stdout.match(errorsRegexPattern));
  return stdout.match(errorsRegexPattern) || []; // check for null
}

/** VALID SYNTAX  (inner double-quotes should be escaped)
 java -jar ./server/api/functions/validator/validate-dslr-string-0.1-jar-with-dependencies.jar "rule \"asdasas asdasd\" when there is 'sort' equals 15 then try end"  ./server/api/functions/validator/ALanguage.dsl
 */

/**
 * Executes a java validator
 * @param {string} text rules text
 * @param {function} responseFn execute a callback after validation
 * @returns {object} { err, stdout }
 */
const validateRules = (text, /* responseFn */) => {
  // console.log(__dirname, process.cwd());
  const cleanedText = text.replace(/[\n\r]+/g, ' ').replace(/"/g, '\\"'); // replacing all new-lines with spaces and escaping any double-quotes
  console.log(cleanedText);
  try {
    // !!!! execSync is non-async process BUT returns a binary Buffer that should get converted to UTF8 string !!!!
    const stdoutBuffer = execSync(`java -jar ./api/functions/validator/validate-dslr-string-0.1-jar-with-dependencies.jar "${cleanedText}" ./api/functions/validator/ALanguage.dsl`);
    const stdout = stdoutBuffer.toString('utf8');
    // (err, stdout, stderr) => { // DECOMISSIONED callback of exec()
    //   console.log('stderr: ', stderr); // unwiring stderr as the jar won't sent any runtime errors and unfortunatelly heroku is using this channel for log messages
    console.log('stdout: ', stdout);
    if (stdout === '[]\r\n' || stdout === '[]') return { err: null, stdout: [] }; // expecting an /r/n ending character
    return { err: null, stdout: parseErrors(stdout) };
    // });
  } catch (err) {
    console.log(err);
    return { err, stdout: null };
  }
};

module.exports = validateRules;
