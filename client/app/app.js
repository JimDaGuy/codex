// Main app page
// Page for main application
class Header extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div id="header">
        <a href="/app" className="headerProjectName">dynalytic</a>
        <a href="/logout" className="logoutLink">Logout</a>
      </div>
    );
  }
}

class WelcomeHome extends React.Component {
  constructor(props) {
    super(props);

    this.state = {

    };
  }

  render() {
    return (
      <div id="welcomeContainer">
        <h2 id="welcomeSubheading">Welcome to dynalytic</h2>
        <span id="welcomeDesc">Upload some data to get started!</span>
      </div>
    );
  }
}

class AddDataset extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      fileUploaded: false,
      createMessage: '',
      error: false,
    };

    this.updateUpload = this.updateUpload.bind(this);
    this.submitCSV = this.submitCSV.bind(this);
  }

  // submitCSV:
  // - Grab file from file input, convert it to json, send it to the server
  // //////////////////////////////
  submitCSV(csrf) {
    const csvFile = $('#csvUpload')[0].files[0];
    const datasetName = $('#datasetName')[0].value;

    // Check that the user has uploaded a CSV
    if (!csvFile) {
      this.setState({
        createMessage: 'No file selected',
        error: true,
      });
      return;
    }

    // Read in the CSV file
    let reader = new FileReader();
    reader.readAsText(csvFile);
    reader.onload = (e) => {
      // Convert CSV to JSON object with JQuery CSV
      const csv = e.target.result;
      const data = $.csv.toObjects(csv);

      //Disable submit button while submitting
      $('#csvButton').attr('disabled', 'disabled');

      // Send array of csv objects to the server
      $.ajax({
        type: "POST",
        url: '/upload',
        data: {
          _csrf: csrf,
          csvData: data,
          datasetName,
        },
        success: (result) => {
          $('#csvButton').removeAttr('disabled');
          this.setState({
            createMessage: result.message,
            error: false,
          });
        },
      }).error((err) => {
        $('#csvButton').removeAttr('disabled');
        this.setState({
          createMessage: err.responseJSON.error,
          error: true,
        });
      });
    };
  };

  // updateUpload:
  // - Change appearance of upload button when a file is uploaded
  // //////////////////////////////
  updateUpload() {
    const csvFile = $('#csvUpload')[0].files[0];

    // If a file is uploaded add a different class to it, else remove it
    if (csvFile) {
      this.setState({ fileUploaded: true });
    } else {
      this.setState({ fileUploaded: false });
    }
  }

  render() {
    const csrf = this.props.csrf;
    const createMessage = this.state.createMessage;
    const error = this.state.error;

    return (
      <div id="addDataContainer">
        <h2 id="addDataSubheading">Upload a CSV file, enter a name, and click create!</h2>
        <label id="datasetNameLabel">Dataset Name:</label>
        <input id="datasetName" type="text" placeholder="Dataset name" />
        <label id="csvUploadContainer" className={this.state.fileUploaded ? 'uploadedCSV' : null} >
          <img id="csvUploadIcon" src="/assets/img/upload_icon.png" />
          <span id="csvUploadSpan">Upload</span>
          <input id="csvUpload" type="file" accept=".csv" onChange={this.updateUpload} />
        </label>
        <button id='csvButton' type="button" onClick={() => this.submitCSV(csrf)}>Create Dataset</button>
        {createMessage !== '' &&
          <div id="statusBoxContainer">
            {!error ?
              <div className="addStatusBox successAdd" >{createMessage}</div>
              :
              <div className="addStatusBox errorAdd" >{createMessage}</div>
            }
          </div>
        }
      </div>
    );
  }
}

class ViewedDataset extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      datasetID: '',
      datasetName: '',
      columns: [],
      entries: [],
      loading: true,
      currentEntry: {},
    };

    this.getDatasetInfo = this.getDatasetInfo.bind(this);
    this.editDataset = this.editDataset.bind(this);
    this.removeEntry = this.removeEntry.bind(this);
    this.updateCurrentEntry = this.updateCurrentEntry.bind(this);
    this.submitCurrentEntry = this.submitCurrentEntry.bind(this);
  }

  componentDidMount() {
    this.getDatasetInfo();
  }

  editDataset(csrf) {
    $.ajax({
      type: "POST",
      url: '/editDataset',
      data: {
        _csrf: csrf,
        entries: this.state.entries,
        datasetID: this.state.datasetID,
      },
      success: () => {
        this.getDatasetInfo();
      },
    }).error((err) => {

    });
  }

  removeEntry(index) {
    let newEntries = this.state.entries;
    newEntries.splice(index, 1);
    this.setState({
      entries: newEntries,
    });
  }

  updateCurrentEntry(e, column) {
    let currentEntry = this.state.currentEntry;
    if (e.target.value === '')
      delete currentEntry[column];
    else
      currentEntry[column] = e.target.value;
    this.setState({
      currentEntry,
    });
  }

  submitCurrentEntry(csrf) {
    // If all entries are empty, ignore the submission
    if (Object.keys(this.state.currentEntry).length === 0) {
      return;
    }

    let currentEntries = this.state.entries;
    currentEntries.unshift(this.state.currentEntry);
    this.setState({
      entries: currentEntries,
    });

    $.ajax({
      type: "POST",
      url: '/editDataset',
      data: {
        _csrf: csrf,
        entries: this.state.entries,
        datasetID: this.state.datasetID,
      },
      success: () => {
        this.getDatasetInfo();
        const columnInputs = $('.datasetColumnInput');
        for (let i = 0; i < columnInputs.length; i++) {
          let ci = columnInputs[i];
          ci.value = '';
        }
        this.setState({
          currentEntry: {},
        });
      },
    }).error((err) => {

    });
  }

  // getDatasetInfo:
  // - Request dataset from the server
  // //////////////////////////////
  async getDatasetInfo() {
    await $.ajax({
      type: "GET",
      url: '/getDataset',
      data: {
        datasetID: this.props.datasetID,
      },
      success: (response) => {
        response = JSON.parse(response);
        const dataset = response.dataset;
        this.setState({
          datasetID: dataset._id,
          datasetName: dataset.datasetName,
          columns: dataset.columns,
          entries: dataset.entries,
          loading: false,
        });
      },
      error: (err) => {
        console.dir(err);
      }
    });
  }

  render() {
    const unviewDataset = this.props.unviewDataset;
    const csrf = this.props.csrf;

    const datasetName = this.state.datasetName;
    const columns = this.state.columns;
    const entries = this.state.entries;
    const loading = this.state.loading;

    return (
      <div id="datasetViewContainer">
        {loading ?
          <div><span>Loading...</span></div>
          :
          <div>
            <div id="datasetViewHeader">
              <h2 id="datasetViewName">{datasetName}</h2>
              <button id="datasetViewButton" onClick={unviewDataset} >Return to Dataset List</button>
              <button id="datasetViewButton" onClick={() => this.editDataset(csrf)} >Save Changes</button>
              <button id="datasetViewButton" onClick={this.getDatasetInfo} >Refresh Dataset</button>
            </div>
            <div className="datasetViewListItem datasetViewHeadingRow">
              <div className="datasetNumBox">#</div>
              {columns.map((column) => {
                return <div className="datasetItemBox datasetColumnBox">{column}</div>
              })}
            </div>
            <div className="datasetViewListItem">
              <div className="submitEntryBox" onClick={() => this.submitCurrentEntry(csrf)} >+</div>
              {columns.map((column) => {
                return <div className="datasetItemBox datasetColumnBox" >
                  <input className="datasetColumnInput" type="text" placeholder={column} onChange={(e) => this.updateCurrentEntry(e, column)} />
                </div>
              })}
            </div>
            {entries.map((entry, index) => {
              return <div className="datasetViewListItem">
                <div className="removeDatasetItemBox" onClick={() => this.removeEntry(index)}>{index}</div>
                {columns.map((column) => {
                  return <div className="datasetItemBox">{entry[column]}</div>
                })
                }
              </div>;
            })}
          </div>
        }
      </div>
    )
  }
}

class DatasetList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedID: '',
    };

    this.componentDidUpdate = this.componentDidUpdate.bind(this);
    this.viewDataset = this.viewDataset.bind(this);
    this.unviewDataset = this.unviewDataset.bind(this);
  }

  // componentDidMount:
  // - Apply styles to the img svg's that can only be done in code after the elements are rendered
  // //////////////////////////////
  componentDidUpdate() {
    // Borrowed from https://stackoverflow.com/questions/11978995/how-to-change-color-of-svg-image-using-css-jquery-svg-image-replacement
    $('img.vlIcon').each(function () {
      var $img = $(this);
      var imgID = $img.attr('id');
      var imgClass = $img.attr('class');
      var imgURL = $img.attr('src');

      $.get(imgURL, function (data) {
        // Get the SVG tag, ignore the rest
        var $svg = $(data).find('svg');

        // Add replaced image's ID to the new SVG
        if (typeof imgID !== 'undefined') {
          $svg = $svg.attr('id', imgID);
        }
        // Add replaced image's classes to the new SVG
        if (typeof imgClass !== 'undefined') {
          $svg = $svg.attr('class', imgClass + ' replaced-svg');
        }

        // Remove any invalid XML tags as per http://validator.w3.org
        $svg = $svg.removeAttr('xmlns:a');

        // Check if the viewport is set, if the viewport is not set the SVG wont't scale.
        if (!$svg.attr('viewBox') && $svg.attr('height') && $svg.attr('width')) {
          $svg.attr('viewBox', '0 0 ' + $svg.attr('height') + ' ' + $svg.attr('width'))
        }

        // Replace image with new SVG
        $img.replaceWith($svg);

      }, 'xml');

    });
  }

  viewDataset(id) {
    this.setState({ selectedID: id });
  }

  unviewDataset() {
    this.setState({ selectedID: '' });
  }

  // downloadDataset:
  // - Retrieve CSV string from server and download the dataset as a CSV
  // //////////////////////////////
  async downloadDataset(id, datasetName) {
    const result = await $.ajax({
      type: "GET",
      url: '/getDatasetCSV',
      data: {
        datasetID: id,
      }
    });

    // Borrowed from https://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(result));
    element.setAttribute('download', `${datasetName}.csv`);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  // removeDataset:
  // - Attempt to remove dataset from the database
  // //////////////////////////////
  async removeDataset(id) {
    await $.ajax({
      type: 'DELETE',
      url: '/removeDataset',
      data: {
        datasetID: id,
        _csrf: this.props.csrf,
      },
      success: () => {
        this.props.getUserDatasets();
      },
    });
  }

  render() {
    const userDatasets = this.props.userDatasets;
    const csrf = this.props.csrf;

    let viewing = this.state.selectedID !== '';

    return (
      <div id="datasetListContainer">
        {viewing ?
          <ViewedDataset datasetID={this.state.selectedID} unviewDataset={this.unviewDataset} csrf={csrf} />
          :
          <div id="datasetListView">
            {userDatasets.length < 1 &&
              <div id="noDatasetsContainer">
                <h2 id="noDatasetsMessage">No datasets yet. Start uploading some data!</h2>
              </div>
            }
            {userDatasets.map((dataset) => {
              return <div className="datasetListItem">
                <span className="datasetListItemSpan datasetListItemName">
                  {dataset.datasetName}
                </span>
                <span className="datasetListItemSpan datasetListItemDate">
                  Last edited: {new Date(dataset.lastEdited).toDateString()}
                </span>
                <span className="datasetListItemSpan datasetListItemLink" onClick={() => { this.viewDataset(dataset._id) }} aria-label="View Dataset" >
                  <img src="/assets/img/view_icon.svg" className="vlIcon" />
                </span>
                <span className="datasetListItemSpan datasetListItemLink" onClick={() => { this.downloadDataset(dataset._id, dataset.datasetName) }} aria-label="Download Dataset" >
                  <img src="/assets/img/download_icon.svg" className="vlIcon" />
                </span>
                <span className="datasetListItemSpan datasetListItemLink" onClick={() => { this.removeDataset(dataset._id) }} aria-label="Delete Dataset" >
                  <img src="/assets/img/remove_icon.svg" className="vlIcon" />
                </span>
              </div>;
            })}
          </div>
        }
      </div>
    )
  }
}

class Analytics extends React.Component {
  constructor(props) {
    super(props);

    this.state = {

    };
  }

  render() {
    return (
      <div id="analyticsContainer">
        <h2 id="analyticsSubheading">No analytics to display</h2>
        <span id="analyticsDesc">
          Analytics will be coming as a premium feature
          in future releases of dynalytic.
        </span>
      </div>
    );
  }
}

class Content extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedPage: "home",
      userDatasets: [],
    };

    this.selectPage = this.selectPage.bind(this);
    this.getUserDatasets = this.getUserDatasets.bind(this);
  }

  selectPage(pageName) {
    this.setState({ selectedPage: pageName });
    if (pageName === "myData") {
      this.getUserDatasets();
    }
  }

  // getUserDatasets:
  // - Load list of the user's datasets
  // //////////////////////////////
  async getUserDatasets() {
    await $.ajax({
      type: "GET",
      url: '/getDatasetList',
      success: (response) => {
        response = JSON.parse(response);
        this.setState({ userDatasets: response.datasets });
      },
      error: (err) => {
        console.dir(err);
      }
    });
  }

  render() {
    const csrf = this.props.csrf;
    let page;

    switch (this.state.selectedPage) {
      case "home":
        page =
          <div id="homePage" className="selectedDashboardPage" >
            <h1>Welcome!</h1>
            <WelcomeHome />
          </div>;
        break;
      case "addData":
        page =
          <div id="addDataPage" className="selectedDashboardPage" >
            <h1>Create a dataset</h1>
            <AddDataset csrf={csrf} />
          </div>;
        break;
      case "myData":
        page =
          <div id="myDataPage" className="selectedDashboardPage" >
            <h1>Here's your data</h1>
            <DatasetList csrf={csrf} getUserDatasets={this.getUserDatasets} userDatasets={this.state.userDatasets} />
          </div>;
        break;
      case "analytics":
        page =
          <div id="analyticsPage" className="selectedDashboardPage" >
            <h1>Analytics here!</h1>
            <Analytics />
          </div>;
        break;
      default:
        break;
    }

    return (
      <div id="content">
        <div id="dashboard">
          <div id="sidebar">
            <div
              className={`sidebarItem ${this.state.selectedPage === 'home' ? 'selectedSidebarItem' : ''}`}
              onClick={() => this.selectPage('home')}
            >
              <span className="sidebarSpan">Home</span>
            </div>
            <div
              className={`sidebarItem ${this.state.selectedPage === 'addData' ? 'selectedSidebarItem' : ''}`}
              onClick={() => this.selectPage('addData')}
            >
              <span className="sidebarSpan">Create Datasets</span>
            </div>
            <div
              className={`sidebarItem ${this.state.selectedPage === 'myData' ? 'selectedSidebarItem' : ''}`}
              onClick={() => this.selectPage('myData')}
            >
              <span className="sidebarSpan">View Datasets</span>
            </div>
            <div
              className={`sidebarItem ${this.state.selectedPage === 'analytics' ? 'selectedSidebarItem' : ''}`}
              onClick={() => this.selectPage('analytics')}
            >
              <span className="sidebarSpan">Analytics</span>
            </div>
          </div>
          <div id="dashboardPage">
            {page}
          </div>
        </div>
      </div>
    );
  }
}

class Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {

    };

  }

  render() {
    const csrf = this.props.csrf;

    return (
      <div id="page">
        <Header />
        <Content csrf={csrf} />
        <div id="footer"></div>
      </div>
    );
  };
}

const getToken = () => {
  sendAjax('GET', '/getToken', null, (result) => {
    renderPage(result.csrfToken);
  });
};

const renderPage = (csrf) => {
  ReactDOM.render(
    <Page csrf={csrf} />,
    document.querySelector("#app")
  );
};

$(document).ready(() => {
  getToken();
});
