// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OrganizationRegistry
 * @dev Enterprise-grade organization & identity registry for multi-tenant logistics
 * 
 * Supports:
 * - Organization registration with verification
 * - User association with organizations
 * - Invite-based onboarding
 * - Partner associations (MFG ↔ Distributor ↔ Transporter ↔ Retailer)
 */
contract OrganizationRegistry is AccessControl {
    bytes32 public constant PLATFORM_ADMIN = keccak256("PLATFORM_ADMIN");
    
    enum OrgType { Manufacturer, Distributor, Transporter, Retailer }
    enum OrgStatus { Pending, Verified, Suspended, Rejected }
    enum InviteStatus { Pending, Accepted, Expired, Revoked }

    struct Organization {
        bytes32 orgId;
        string name;
        string gstNumber;
        string contactEmail;
        OrgType orgType;
        OrgStatus status;
        address primaryWallet;
        string metadataHash;  // IPFS hash for full details
        uint256 createdAt;
        uint256 verifiedAt;
    }

    struct PartnerLink {
        bytes32 fromOrgId;
        bytes32 toOrgId;
        bool approved;
        uint256 linkedAt;
    }

    struct Invite {
        bytes32 inviteId;
        bytes32 orgId;
        string email;
        string role;  // "Admin", "Manager", "Operator", "Driver"
        InviteStatus status;
        uint256 expiresAt;
        address claimedBy;
    }

    // Storage
    mapping(bytes32 => Organization) public organizations;
    mapping(address => bytes32) public walletToOrg;  // wallet → orgId
    mapping(bytes32 => address[]) public orgMembers;  // orgId → member wallets
    mapping(bytes32 => Invite) public invites;
    mapping(bytes32 => mapping(bytes32 => PartnerLink)) public partnerships; // fromOrg → toOrg → link

    bytes32[] public allOrgIds;
    
    // Events
    event OrgRegistered(bytes32 indexed orgId, string name, OrgType orgType, address primaryWallet);
    event OrgVerified(bytes32 indexed orgId, uint256 timestamp);
    event OrgSuspended(bytes32 indexed orgId, string reason);
    event MemberAdded(bytes32 indexed orgId, address member, string role);
    event MemberRemoved(bytes32 indexed orgId, address member);
    event InviteCreated(bytes32 indexed inviteId, bytes32 indexed orgId, string email, string role);
    event InviteClaimed(bytes32 indexed inviteId, address claimedBy);
    event PartnershipRequested(bytes32 indexed fromOrg, bytes32 indexed toOrg);
    event PartnershipApproved(bytes32 indexed fromOrg, bytes32 indexed toOrg);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PLATFORM_ADMIN, msg.sender);
    }

    // ==================== ORGANIZATION REGISTRATION ====================

    /**
     * @dev Register a new organization (self-service)
     */
    function registerOrg(
        string memory _name,
        string memory _gstNumber,
        string memory _contactEmail,
        OrgType _orgType,
        string memory _metadataHash
    ) public returns (bytes32) {
        require(walletToOrg[msg.sender] == bytes32(0), "Wallet already linked to org");
        
        bytes32 orgId = keccak256(abi.encodePacked(_gstNumber, block.timestamp, msg.sender));
        
        organizations[orgId] = Organization({
            orgId: orgId,
            name: _name,
            gstNumber: _gstNumber,
            contactEmail: _contactEmail,
            orgType: _orgType,
            status: OrgStatus.Pending,
            primaryWallet: msg.sender,
            metadataHash: _metadataHash,
            createdAt: block.timestamp,
            verifiedAt: 0
        });

        walletToOrg[msg.sender] = orgId;
        orgMembers[orgId].push(msg.sender);
        allOrgIds.push(orgId);

        emit OrgRegistered(orgId, _name, _orgType, msg.sender);
        return orgId;
    }

    /**
     * @dev Platform admin verifies an organization
     */
    function verifyOrg(bytes32 _orgId) public onlyRole(PLATFORM_ADMIN) {
        require(organizations[_orgId].createdAt != 0, "Org not found");
        require(organizations[_orgId].status == OrgStatus.Pending, "Already verified or rejected");

        organizations[_orgId].status = OrgStatus.Verified;
        organizations[_orgId].verifiedAt = block.timestamp;

        emit OrgVerified(_orgId, block.timestamp);
    }

    /**
     * @dev Platform admin suspends an organization
     */
    function suspendOrg(bytes32 _orgId, string memory _reason) public onlyRole(PLATFORM_ADMIN) {
        require(organizations[_orgId].createdAt != 0, "Org not found");
        organizations[_orgId].status = OrgStatus.Suspended;
        emit OrgSuspended(_orgId, _reason);
    }

    // ==================== INVITE SYSTEM ====================

    /**
     * @dev Org admin creates invite for new member
     */
    function createInvite(
        string memory _email,
        string memory _role,
        uint256 _expiresInDays
    ) public returns (bytes32) {
        bytes32 orgId = walletToOrg[msg.sender];
        require(orgId != bytes32(0), "Not part of any org");
        require(organizations[orgId].status == OrgStatus.Verified, "Org not verified");

        bytes32 inviteId = keccak256(abi.encodePacked(_email, block.timestamp, msg.sender));
        
        invites[inviteId] = Invite({
            inviteId: inviteId,
            orgId: orgId,
            email: _email,
            role: _role,
            status: InviteStatus.Pending,
            expiresAt: block.timestamp + (_expiresInDays * 1 days),
            claimedBy: address(0)
        });

        emit InviteCreated(inviteId, orgId, _email, _role);
        return inviteId;
    }

    /**
     * @dev User claims an invite to join organization
     */
    function claimInvite(bytes32 _inviteId) public {
        Invite storage inv = invites[_inviteId];
        require(inv.status == InviteStatus.Pending, "Invite not available");
        require(block.timestamp < inv.expiresAt, "Invite expired");
        require(walletToOrg[msg.sender] == bytes32(0), "Already in an org");

        inv.status = InviteStatus.Accepted;
        inv.claimedBy = msg.sender;

        walletToOrg[msg.sender] = inv.orgId;
        orgMembers[inv.orgId].push(msg.sender);

        emit InviteClaimed(_inviteId, msg.sender);
        emit MemberAdded(inv.orgId, msg.sender, inv.role);
    }

    // ==================== PARTNERSHIP / ASSOCIATION ====================

    /**
     * @dev Request partnership with another org (e.g., Distributor requests MFG)
     */
    function requestPartnership(bytes32 _targetOrgId) public {
        bytes32 myOrgId = walletToOrg[msg.sender];
        require(myOrgId != bytes32(0), "Not part of any org");
        require(organizations[myOrgId].status == OrgStatus.Verified, "Your org not verified");
        require(organizations[_targetOrgId].status == OrgStatus.Verified, "Target org not verified");
        require(partnerships[myOrgId][_targetOrgId].linkedAt == 0, "Already linked or pending");

        partnerships[myOrgId][_targetOrgId] = PartnerLink({
            fromOrgId: myOrgId,
            toOrgId: _targetOrgId,
            approved: false,
            linkedAt: block.timestamp
        });

        emit PartnershipRequested(myOrgId, _targetOrgId);
    }

    /**
     * @dev Approve partnership request from another org
     */
    function approvePartnership(bytes32 _requesterOrgId) public {
        bytes32 myOrgId = walletToOrg[msg.sender];
        require(myOrgId != bytes32(0), "Not part of any org");
        require(partnerships[_requesterOrgId][myOrgId].linkedAt != 0, "No pending request");
        require(!partnerships[_requesterOrgId][myOrgId].approved, "Already approved");

        partnerships[_requesterOrgId][myOrgId].approved = true;
        
        // Create bidirectional link
        partnerships[myOrgId][_requesterOrgId] = PartnerLink({
            fromOrgId: myOrgId,
            toOrgId: _requesterOrgId,
            approved: true,
            linkedAt: block.timestamp
        });

        emit PartnershipApproved(_requesterOrgId, myOrgId);
    }

    // ==================== VIEW FUNCTIONS ====================

    function getOrgCount() public view returns (uint256) {
        return allOrgIds.length;
    }

    function getOrgMembers(bytes32 _orgId) public view returns (address[] memory) {
        return orgMembers[_orgId];
    }

    function isPartner(bytes32 _org1, bytes32 _org2) public view returns (bool) {
        return partnerships[_org1][_org2].approved;
    }

    function getMyOrg() public view returns (bytes32) {
        return walletToOrg[msg.sender];
    }

    function isVerified(bytes32 _orgId) public view returns (bool) {
        return organizations[_orgId].status == OrgStatus.Verified;
    }
}
