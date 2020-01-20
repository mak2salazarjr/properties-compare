import {Application, Context} from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {

  interface Property {
    name: string,
    value: string
  }

  async function compareProperties(context: Context) {
    const issue = context.issue();
    const allFiles = await context.github.pulls.listFiles(issue);
    const propertiesMap = new Map<string, Map<string, Property[]>>();
    let propertiesFileNames : string[] = [];
    for (const file of allFiles.data) {
      if (file.filename.includes(".properties")) {
        let filenameArray = file.filename.split("/");
        let filename = filenameArray[filenameArray.length - 1];
        propertiesFileNames.push(filename);
        //Regex will match lines starting with either space or +, right now this would only work for application.properties
        //TODO: extract into helper class and make applicable for yaml properties as well
        const lines = file.patch.match(/(^[\s+])+\s*(.*)/gm);
        if (lines !== null) {
          lines
              .map(line => line.replace(/(^[\s+-])+\s*/, "").split("="))
              .forEach(line => {
                let propertyMap : any;
                if (propertiesMap.has(line[0]) && propertiesMap.get(line[0]) !== undefined) {
                  propertyMap = propertiesMap.get(line[0]);
                } else {
                  propertyMap = new Map<string, Property[]>();
                }
                propertyMap.set(filename, {
                  name: line[0],
                  value: line[1]
                });
                propertiesMap.set(line[0], propertyMap);
              });
        }
      }
    }

    const propertyPresentIndicator = "<td align='center'>&#9989;</td>";
    let propertyMissingIndicator = "<td align='center'>&#10060;</td>";
    let comment = "<b>Don't forget to double-check that you have added appropriate properties in the properties file!</b>\n\nI have found the following properties in this PR:";
    comment += "<table style='width:100%'><tr><th></th>";
    propertiesFileNames.forEach(propertiesFileName => comment += "<th><i>" + propertiesFileName + "</i></th>");
    comment += "</tr><tr>";
    propertiesMap.forEach((propertyMap, propertyName) => {
      comment += "<td><b>" + propertyName + "</b></td>";
      propertiesFileNames.forEach(propertiesFileName => {
        if (propertyMap.has(propertiesFileName)) {
          comment += propertyPresentIndicator;
        } else {
          comment += propertyMissingIndicator;
        }
      });
      comment += "</tr>";
    });
    comment += "</table>";

    const params = context.issue({body: comment});
    context.github.issues.createComment(params);
  }

  app.on([
    '*'
  ], compareProperties);
}
