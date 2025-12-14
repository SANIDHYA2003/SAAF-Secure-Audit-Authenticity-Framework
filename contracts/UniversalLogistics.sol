// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UniversalLogistics
 * @dev Enterprise-grade supply chain verification + traceability platform
 * Features:
 * - Transporter Pool per Manufacturer (approval-based)
 * - Shipment Access Control (only assigned parties can act)
 * - Full chain-of-custody tracking
 */
contract UniversalLogistics is AccessControl {
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant LOGISTICS_ROLE = keccak256("LOGISTICS_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");

    enum BatchStatus { Created, InTransit, Arrived, Delivered, Consumed, Recalled, Expired }
    enum ShipmentStatus { Created, PickedUp, InTransit, Delivered, Accepted, Rejected }
    enum TransporterStatus { Pending, Approved, Rejected, Suspended }

    // ==================== STRUCTS ====================

    struct Product {
        string id;
        string name;
        string category;
        address manufacturer;
        bool registered;
    }

    struct Batch {
        string id;
        string productId;
        string parentBatchId;
        uint256 quantity;
        uint256 mfgDate;
        uint256 expDate;
        address currentOwner;
        BatchStatus status;
        string location;
    }

    struct Shipment {
        string id;
        string[] batchIds;
        address sender;
        address receiver;
        address transporter;
        ShipmentStatus status;
        string notes;
        uint256 timestamp;
        string vehicleNumber;
        string driverName;
        string driverContact;
    }

    // Simplified Transporter profile
    struct Transporter {
        address wallet;
        string name;
        string licenseNumber;
        string contactNumber;
        bool coldChainCapable;
        TransporterStatus status;
        address approvedBy;
        uint256 registeredAt;
    }

    // ==================== MAPPINGS ====================

    mapping(string => Product) public products;
    mapping(string => Batch) public batches;
    mapping(string => Shipment) public shipments;
    mapping(address => Transporter) public transporters;

    // Transporter Pool: Manufacturer => list of approved transporter addresses
    mapping(address => address[]) public manufacturerTransporterPool;
    mapping(address => mapping(address => bool)) public isApprovedTransporter;

    // Pending transporter requests: manufacturer => list of pending transporter wallets
    mapping(address => address[]) public pendingTransporterRequests;
    mapping(address => mapping(address => bool)) public hasPendingRequest;
    mapping(address => mapping(address => address)) public requestedBy; // mfg => transporter => distributor

    // Indexing for frontend
    mapping(address => string[]) public ownerToBatches;
    mapping(address => string[]) public userToShipments;

    // ==================== EVENTS ====================

    event ProductRegistered(string id, string name, address indexed manufacturer);
    event BatchCreated(string batchId, string productId, uint256 quantity, address indexed owner);
    event BatchSplit(string parentId, string newBatchId, uint256 quantity);
    event ShipmentCreated(string shipmentId, address indexed sender, address indexed receiver, address indexed transporter);
    event ShipmentStatusChanged(string shipmentId, ShipmentStatus status, address indexed actor, string location);
    event BatchOwnershipTransferred(string batchId, address indexed from, address indexed to);
    event SaleRecorded(string batchId, uint256 quantity, address indexed seller);
    event RecallInitiated(string batchId, string reason, address indexed initiator);
    
    event TransporterAdded(address indexed transporter, address indexed manufacturer);
    event TransporterRequested(address indexed transporter, address indexed requestedBy, address indexed manufacturer);
    event TransporterApproved(address indexed transporter, address indexed manufacturer);
    event TransporterRejected(address indexed transporter, address indexed manufacturer);

    // ==================== CONSTRUCTOR ====================

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANUFACTURER_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
        _grantRole(RETAILER_ROLE, msg.sender);
        _grantRole(LOGISTICS_ROLE, msg.sender);
    }

    // ==================== ROLE ASSIGNMENT ====================

    function grantManufacturerRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MANUFACTURER_ROLE, account);
    }

    function grantDistributorRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DISTRIBUTOR_ROLE, account);
    }

    function grantLogisticsRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(LOGISTICS_ROLE, account);
    }

    function grantRetailerRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(RETAILER_ROLE, account);
    }

    // ==================== TRANSPORTER POOL MANAGEMENT ====================

    /**
     * @dev Manufacturer directly adds a transporter to their pool
     */
    function addTransporterToPool(
        address _wallet,
        string memory _name,
        string memory _licenseNumber,
        string memory _contactNumber,
        bool _coldChainCapable
    ) public onlyRole(MANUFACTURER_ROLE) {
        require(_wallet != address(0), "Invalid address");
        require(!isApprovedTransporter[msg.sender][_wallet], "Already approved");

        transporters[_wallet] = Transporter({
            wallet: _wallet,
            name: _name,
            licenseNumber: _licenseNumber,
            contactNumber: _contactNumber,
            coldChainCapable: _coldChainCapable,
            status: TransporterStatus.Approved,
            approvedBy: msg.sender,
            registeredAt: block.timestamp
        });

        manufacturerTransporterPool[msg.sender].push(_wallet);
        isApprovedTransporter[msg.sender][_wallet] = true;
        _grantRole(LOGISTICS_ROLE, _wallet);

        emit TransporterAdded(_wallet, msg.sender);
    }

    /**
     * @dev Distributor requests a transporter be added to manufacturer's pool
     */
    function requestTransporter(
        address _manufacturer,
        address _transporterWallet,
        string memory _name,
        string memory _licenseNumber,
        string memory _contactNumber,
        bool _coldChainCapable
    ) public onlyRole(DISTRIBUTOR_ROLE) {
        require(!isApprovedTransporter[_manufacturer][_transporterWallet], "Already approved");
        require(!hasPendingRequest[_manufacturer][_transporterWallet], "Already requested");

        transporters[_transporterWallet] = Transporter({
            wallet: _transporterWallet,
            name: _name,
            licenseNumber: _licenseNumber,
            contactNumber: _contactNumber,
            coldChainCapable: _coldChainCapable,
            status: TransporterStatus.Pending,
            approvedBy: address(0),
            registeredAt: block.timestamp
        });

        pendingTransporterRequests[_manufacturer].push(_transporterWallet);
        hasPendingRequest[_manufacturer][_transporterWallet] = true;
        requestedBy[_manufacturer][_transporterWallet] = msg.sender;

        emit TransporterRequested(_transporterWallet, msg.sender, _manufacturer);
    }

    /**
     * @dev Manufacturer approves a pending transporter request
     */
    function approveTransporter(address _transporterWallet) public onlyRole(MANUFACTURER_ROLE) {
        require(hasPendingRequest[msg.sender][_transporterWallet], "No pending request");

        transporters[_transporterWallet].status = TransporterStatus.Approved;
        transporters[_transporterWallet].approvedBy = msg.sender;

        manufacturerTransporterPool[msg.sender].push(_transporterWallet);
        isApprovedTransporter[msg.sender][_transporterWallet] = true;
        hasPendingRequest[msg.sender][_transporterWallet] = false;

        _grantRole(LOGISTICS_ROLE, _transporterWallet);

        emit TransporterApproved(_transporterWallet, msg.sender);
    }

    /**
     * @dev Manufacturer rejects a pending transporter request
     */
    function rejectTransporter(address _transporterWallet) public onlyRole(MANUFACTURER_ROLE) {
        require(hasPendingRequest[msg.sender][_transporterWallet], "No pending request");

        transporters[_transporterWallet].status = TransporterStatus.Rejected;
        hasPendingRequest[msg.sender][_transporterWallet] = false;

        emit TransporterRejected(_transporterWallet, msg.sender);
    }

    /**
     * @dev Get transporter pool count for a manufacturer
     */
    function getTransporterPoolCount(address _manufacturer) public view returns (uint256) {
        return manufacturerTransporterPool[_manufacturer].length;
    }

    /**
     * @dev Get pending requests count for a manufacturer
     */
    function getPendingRequestsCount(address _manufacturer) public view returns (uint256) {
        return pendingTransporterRequests[_manufacturer].length;
    }

    // ==================== PRODUCT MANAGEMENT ====================

    function registerProduct(
        string memory _id, 
        string memory _name, 
        string memory _category
    ) public onlyRole(MANUFACTURER_ROLE) {
        require(!products[_id].registered, "Product already exists");
        
        products[_id] = Product({
            id: _id,
            name: _name,
            category: _category,
            manufacturer: msg.sender,
            registered: true
        });

        emit ProductRegistered(_id, _name, msg.sender);
    }

    // ==================== BATCH MANAGEMENT ====================

    function createBatch(
        string memory _batchId, 
        string memory _productId, 
        uint256 _quantity, 
        uint256 _expDate, 
        string memory _location
    ) public onlyRole(MANUFACTURER_ROLE) {
        require(products[_productId].registered, "Product not registered");
        require(batches[_batchId].mfgDate == 0, "Batch exists");

        batches[_batchId] = Batch({
            id: _batchId,
            productId: _productId,
            parentBatchId: "",
            quantity: _quantity,
            mfgDate: block.timestamp,
            expDate: _expDate,
            currentOwner: msg.sender,
            status: BatchStatus.Created,
            location: _location
        });

        ownerToBatches[msg.sender].push(_batchId);
        emit BatchCreated(_batchId, _productId, _quantity, msg.sender);
    }

    function splitBatch(
        string memory _parentBatchId, 
        string memory _newBatchId, 
        uint256 _quantity
    ) public {
        Batch storage parent = batches[_parentBatchId];
        require(parent.currentOwner == msg.sender, "Not owner");
        require(parent.quantity >= _quantity, "Insufficient qty");
        require(batches[_newBatchId].mfgDate == 0, "New batch exists");

        parent.quantity -= _quantity;

        batches[_newBatchId] = Batch({
            id: _newBatchId,
            productId: parent.productId,
            parentBatchId: _parentBatchId,
            quantity: _quantity,
            mfgDate: parent.mfgDate,
            expDate: parent.expDate,
            currentOwner: msg.sender,
            status: parent.status,
            location: parent.location
        });

        ownerToBatches[msg.sender].push(_newBatchId);
        emit BatchSplit(_parentBatchId, _newBatchId, _quantity);
    }

    // ==================== SHIPMENT MANAGEMENT ====================

    function createShipment(
        string memory _shipmentId, 
        string[] memory _batchIds, 
        address _receiver, 
        address _transporter, 
        string memory _startLocation,
        string memory _vehicleNumber,
        string memory _driverName,
        string memory _driverContact
    ) public {
        require(shipments[_shipmentId].timestamp == 0, "Shipment exists");
        
        // Verify ownership of all batches
        for (uint i = 0; i < _batchIds.length; i++) {
            require(batches[_batchIds[i]].currentOwner == msg.sender, "Not batch owner");
            require(batches[_batchIds[i]].status != BatchStatus.Recalled, "Batch recalled");
            batches[_batchIds[i]].status = BatchStatus.InTransit; 
        }

        shipments[_shipmentId] = Shipment({
            id: _shipmentId,
            batchIds: _batchIds,
            sender: msg.sender,
            receiver: _receiver,
            transporter: _transporter,
            status: ShipmentStatus.Created,
            notes: "Ready for pickup",
            timestamp: block.timestamp,
            vehicleNumber: _vehicleNumber,
            driverName: _driverName,
            driverContact: _driverContact
        });

        userToShipments[msg.sender].push(_shipmentId);
        userToShipments[_receiver].push(_shipmentId);
        if (_transporter != msg.sender) {
            userToShipments[_transporter].push(_shipmentId);
        }

        emit ShipmentCreated(_shipmentId, msg.sender, _receiver, _transporter);
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Created, msg.sender, _startLocation);
    }

    /**
     * @dev Self-delivery: Creates shipment and immediately marks as Delivered
     * Used when sender delivers directly without external transporter
     */
    function selfDeliverShipment(
        string memory _shipmentId, 
        string[] memory _batchIds, 
        address _receiver, 
        string memory _location,
        string memory _vehicleNumber,
        string memory _driverName,
        string memory _driverContact
    ) public {
        require(shipments[_shipmentId].timestamp == 0, "Shipment exists");
        
        // Verify ownership and update batch status
        for (uint i = 0; i < _batchIds.length; i++) {
            require(batches[_batchIds[i]].currentOwner == msg.sender, "Not batch owner");
            require(batches[_batchIds[i]].status != BatchStatus.Recalled, "Batch recalled");
            batches[_batchIds[i]].status = BatchStatus.Arrived;
            batches[_batchIds[i]].location = _location;
        }

        // Create shipment with status = Delivered (skipping pickup/transit)
        shipments[_shipmentId] = Shipment({
            id: _shipmentId,
            batchIds: _batchIds,
            sender: msg.sender,
            receiver: _receiver,
            transporter: msg.sender,  // Self = sender is transporter
            status: ShipmentStatus.Delivered,
            notes: "Self-delivered",
            timestamp: block.timestamp,
            vehicleNumber: _vehicleNumber,
            driverName: _driverName,
            driverContact: _driverContact
        });

        userToShipments[msg.sender].push(_shipmentId);
        userToShipments[_receiver].push(_shipmentId);

        emit ShipmentCreated(_shipmentId, msg.sender, _receiver, msg.sender);
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Delivered, msg.sender, _location);
    }

    function confirmPickup(string memory _shipmentId, string memory _location) public {
        Shipment storage s = shipments[_shipmentId];
        require(s.transporter == msg.sender, "Not assigned transporter");
        require(s.status == ShipmentStatus.Created, "Invalid status");

        s.status = ShipmentStatus.PickedUp;
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.PickedUp, msg.sender, _location);
    }

    function updateTransitLog(string memory _shipmentId, string memory _logData, string memory _location) public {
        Shipment storage s = shipments[_shipmentId];
        require(s.transporter == msg.sender, "Not assigned transporter");

        s.status = ShipmentStatus.InTransit;
        s.notes = _logData;
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.InTransit, msg.sender, _location);
    }

    function completeDelivery(string memory _shipmentId, string memory _location) public {
        Shipment storage s = shipments[_shipmentId];
        require(s.transporter == msg.sender, "Not assigned transporter");

        s.status = ShipmentStatus.Delivered;
        
        for (uint i = 0; i < s.batchIds.length; i++) {
            batches[s.batchIds[i]].status = BatchStatus.Arrived;
            batches[s.batchIds[i]].location = _location;
        }

        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Delivered, msg.sender, _location);
    }

    function acceptDelivery(string memory _shipmentId, string memory _location) public {
        Shipment storage s = shipments[_shipmentId];
        require(s.receiver == msg.sender, "Not assigned receiver");
        require(s.status == ShipmentStatus.Delivered, "Not delivered yet");

        s.status = ShipmentStatus.Accepted;

        for (uint i = 0; i < s.batchIds.length; i++) {
            address previousOwner = batches[s.batchIds[i]].currentOwner;
            batches[s.batchIds[i]].currentOwner = msg.sender;
            batches[s.batchIds[i]].status = BatchStatus.Delivered;
            batches[s.batchIds[i]].location = _location;
            
            ownerToBatches[msg.sender].push(s.batchIds[i]);
            emit BatchOwnershipTransferred(s.batchIds[i], previousOwner, msg.sender);
        }

        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Accepted, msg.sender, _location);
    }

    // ==================== RETAIL ====================

    function sellToCustomer(string memory _batchId, uint256 _qty) public onlyRole(RETAILER_ROLE) {
        Batch storage b = batches[_batchId];
        require(b.currentOwner == msg.sender, "Not owner");
        require(b.quantity >= _qty, "Insufficient qty");

        b.quantity -= _qty;
        if (b.quantity == 0) {
            b.status = BatchStatus.Consumed;
        }

        emit SaleRecorded(_batchId, _qty, msg.sender);
    }

    // ==================== RECALL ====================

    function initiateRecall(string memory _batchId, string memory _reason) public onlyRole(REGULATOR_ROLE) {
        Batch storage b = batches[_batchId];
        require(b.mfgDate != 0, "Batch not found");
        
        b.status = BatchStatus.Recalled;
        emit RecallInitiated(_batchId, _reason, msg.sender);
    }

    // ==================== VIEW FUNCTIONS ====================

    function getShipmentBatches(string memory _shipmentId) public view returns (string[] memory) {
        return shipments[_shipmentId].batchIds;
    }

    function getUserShipmentsCount(address _user) public view returns (uint256) {
        return userToShipments[_user].length;
    }

    function getOwnerBatchesCount(address _owner) public view returns (uint256) {
        return ownerToBatches[_owner].length;
    }
}
